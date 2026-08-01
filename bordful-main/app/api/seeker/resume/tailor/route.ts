import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getJob } from '@/lib/db/airtable.server';
import { aiChatCompletion } from '@/lib/ai/provider';
import { AIProviderError } from '@/lib/ai/types';
import { checkAndIncrementResumeTailorUsage } from '@/lib/jobs/entitlements-actions';
import type { ResumeContent } from '@/lib/jobs/resume-actions';
import {
  isTailoredResumeContent,
  type TailoredResumeContent,
} from '@/lib/jobs/tailored-resume-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// The model is told not to use markdown, but strip it defensively anyway -
// asterisks/hashes/backticks rendered literally (not as bold/headers) in the
// plain-text output box, which just looked like broken AI slop.
function stripMarkdown(text: string): string {
  return text
    .replace(/^```[a-z]*\n?/gim, '')
    .replace(/```\s*$/gim, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^[ \t]*[-*]\s+/gm, '- ')
    .trim();
}

function resumeToPlainText(content: ResumeContent, email?: string | null): string {
  const lines: string[] = [];
  if (content.fullName) lines.push(content.fullName);
  if (email) lines.push(`Email: ${email}`);
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

  const contactRule =
    'Only use contact details (email, phone, address) that are explicitly ' +
    'given to you below - if none is given, leave the contact field empty. ' +
    'Never invent a placeholder email like name@example.com or any other ' +
    'placeholder contact info.';
  const factsRule =
    'Do not invent experience, skills, employers, or achievements that are ' +
    'not present in the original resume - only reorder, re-emphasize, and ' +
    'rephrase what is already there.';

  const userPrompt = [
    jobTitle ? `Target role: ${jobTitle}${jobCompany ? ` at ${jobCompany}` : ''}` : null,
    `Job description:\n${jobDescription}`,
    `Candidate resume:\n${resumeToPlainText(resume, session.user.email)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (mode === 'cover-letter') {
    const formattingRules =
      'Output plain text only, formatted like a real document ready to ' +
      'paste into an email or application form: no markdown syntax ' +
      'whatsoever - no **bold**, no # headings, no backticks, no asterisk ' +
      'bullets. Use plain hyphens (-) for any list items and blank lines ' +
      'between sections. Do not include any preamble, explanation, or ' +
      'commentary ("Here is your cover letter:", "Sure, here\'s...") ' +
      `before or after the content - output only the letter itself, nothing else. ${contactRule}`;
    const systemPrompt = `You are an expert career coach. Write a concise, specific, and honest cover letter (max 350 words) based only on the facts in the resume provided. ${factsRule} Address why the candidate fits this specific role. Write in a natural, human voice - not generic AI phrasing ("I am excited to apply", "I believe I would be a great fit"). ${formattingRules}`;

    try {
      const output = await aiChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.4, maxTokens: 1200 }
      );
      return NextResponse.json({ kind: 'text', output: stripMarkdown(output) });
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

  // Resume mode returns structured JSON (not a text blob) so the client can
  // render it as a real document and let the user live-edit individual
  // fields before exporting to PDF - see HarvardResumePreview/Pdf.
  const jsonShapeInstructions =
    'Respond with ONLY a single JSON object (no markdown code fence, no ' +
    'preamble, no commentary before or after) matching exactly this shape:\n' +
    '{"fullName": string, "contact": string, "headline": string, ' +
    '"summary": string, "experience": [{"title": string, "company": ' +
    'string, "dates": string, "bullets": string[]}], "education": ' +
    '[{"school": string, "degree": string, "year": string}], "skills": ' +
    'string[]}\n' +
    'Rewrite bullets and summary to emphasize what is most relevant to the ' +
    'target job. Keep the same roles/schools/years as the original resume - ' +
    `only rephrase and reorder content within each. ${factsRule} ${contactRule}`;
  const systemPrompt = `You are an expert resume writer producing a tailored, ATS-friendly resume for a specific job. ${jsonShapeInstructions}`;

  function extractJson(raw: string): unknown {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      throw new Error('No JSON object found in AI response');
    }
    return JSON.parse(raw.slice(start, end + 1));
  }

  function normalizeTailoredResume(parsed: unknown): TailoredResumeContent {
    if (!isTailoredResumeContent(parsed)) {
      throw new Error('AI response did not match the expected resume shape');
    }
    return {
      fullName: parsed.fullName,
      contact: parsed.contact ?? '',
      headline: parsed.headline,
      summary: parsed.summary,
      experience: parsed.experience.map((entry) => ({
        title: entry?.title ?? '',
        company: entry?.company ?? '',
        dates: entry?.dates ?? '',
        bullets: Array.isArray(entry?.bullets) ? entry.bullets.filter((b) => typeof b === 'string') : [],
      })),
      education: parsed.education.map((entry) => ({
        school: entry?.school ?? '',
        degree: entry?.degree ?? '',
        year: entry?.year ?? '',
      })),
      skills: parsed.skills.filter((s) => typeof s === 'string'),
    };
  }

  const conversation: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
    let lastRawOutput = '';
    let tailored: TailoredResumeContent | null = null;

    // One retry: if the model's first reply isn't valid/complete JSON, tell
    // it so explicitly and ask again, rather than failing the whole request
    // over a formatting slip.
    for (let attempt = 0; attempt < 2 && !tailored; attempt++) {
      lastRawOutput = await aiChatCompletion(conversation, { temperature: 0.4, maxTokens: 1800 });
      try {
        tailored = normalizeTailoredResume(extractJson(lastRawOutput));
      } catch {
        conversation.push({ role: 'assistant', content: lastRawOutput });
        conversation.push({
          role: 'user',
          content:
            'That was not a single valid JSON object matching the required shape. ' +
            'Respond again with ONLY the corrected JSON object, nothing else.',
        });
      }
    }

    if (!tailored) {
      throw new Error('AI did not return a valid structured resume after retrying');
    }

    return NextResponse.json({ kind: 'resume', output: tailored });
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
