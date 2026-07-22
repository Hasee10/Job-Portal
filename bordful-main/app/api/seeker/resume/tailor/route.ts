import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getJob } from '@/lib/db/airtable.server';
import { aiChatCompletion } from '@/lib/ai/provider';
import { AIProviderError } from '@/lib/ai/types';
import { checkAndIncrementResumeTailorUsage } from '@/lib/jobs/entitlements-actions';
import type { ResumeContent } from '@/lib/jobs/resume-actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function resumeToPlainText(content: ResumeContent): string {
  const lines: string[] = [];
  if (content.fullName) lines.push(content.fullName);
  if (content.headline) lines.push(content.headline);
  if (content.summary) lines.push(`Summary: ${content.summary}`);
  if (content.experience.length) {
    lines.push('Experience:');
    for (const job of content.experience) {
      lines.push(
        `- ${job.title} at ${job.company} (${job.startDate} - ${job.endDate}): ${job.description}`
      );
    }
  }
  if (content.education.length) {
    lines.push('Education:');
    for (const edu of content.education) {
      lines.push(`- ${edu.degree}, ${edu.school} (${edu.year})`);
    }
  }
  if (content.skills.length) {
    lines.push(`Skills: ${content.skills.join(', ')}`);
  }
  return lines.join('\n');
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const usage = await checkAndIncrementResumeTailorUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `Free plan is limited to ${usage.limit} AI tailoring requests per month. Upgrade to Premium for more (coming soon).`,
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const mode = body.mode === 'cover-letter' ? 'cover-letter' : 'resume';
  const resume = body.resume as ResumeContent | undefined;
  if (!resume) {
    return NextResponse.json({ error: 'Resume content is required.' }, { status: 400 });
  }

  let jobTitle = '';
  let jobCompany = '';
  let jobDescription = '';

  if (typeof body.jobId === 'string' && body.jobId) {
    const job = await getJob(body.jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    jobTitle = job.title;
    jobCompany = job.company;
    jobDescription = job.description;
  } else if (typeof body.jobDescription === 'string' && body.jobDescription.trim()) {
    jobDescription = body.jobDescription.trim().slice(0, 6000);
  } else {
    return NextResponse.json(
      { error: 'Provide either a jobId or a jobDescription.' },
      { status: 400 }
    );
  }

  const systemPrompt =
    mode === 'cover-letter'
      ? 'You are an expert career coach. Write a concise, specific, and honest cover letter (max 350 words) based only on the facts in the resume provided. Do not invent experience, skills, or achievements that are not in the resume. Address why the candidate fits this specific role.'
      : 'You are an expert resume writer. Rewrite the given resume content to better emphasize the experience and skills most relevant to the target job. Do not invent experience, skills, employers, or achievements that are not present in the original resume - only reorder, re-emphasize, and rephrase what is already there. Return the tailored resume as clean plain text.';

  const userPrompt = [
    jobTitle ? `Target role: ${jobTitle}${jobCompany ? ` at ${jobCompany}` : ''}` : null,
    `Job description:\n${jobDescription}`,
    `Candidate resume:\n${resumeToPlainText(resume)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const output = await aiChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.4, maxTokens: 1200 }
    );

    return NextResponse.json({ output });
  } catch (error) {
    if (error instanceof AIProviderError && error.notConfigured) {
      return NextResponse.json(
        { error: 'AI tailoring is not available yet on this deployment.' },
        { status: 503 }
      );
    }
    console.error('[api/seeker/resume/tailor] AI request failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate tailored content. Please try again.' },
      { status: 502 }
    );
  }
}
