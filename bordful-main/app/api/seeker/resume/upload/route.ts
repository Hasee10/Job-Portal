import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiChatCompletion } from '@/lib/ai/provider';
import { AIProviderError } from '@/lib/ai/types';
import { getJobs } from '@/lib/db/airtable.server';
import config from '@/config';
import {
  markSeekerResumeMatched,
  saveSeekerResume,
  type ResumeContent,
} from '@/lib/jobs/resume-actions';
import { matchJobsBySkills } from '@/lib/jobs/resume-matching';
import { sendEmail } from '@/lib/email/smtp';
import { generateJobSlug } from '@/lib/utils/slugify';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_MATCHES = 10;

const EXTRACTION_SYSTEM_PROMPT =
  'You extract structured resume data from raw resume text. Only use ' +
  'information explicitly present in the text - never invent employers, ' +
  'dates, schools, or skills. Respond with strict JSON only (no markdown ' +
  'fences, no commentary) matching exactly this shape: {"fullName": string, ' +
  '"headline": string, "summary": string, "experience": [{"title": string, ' +
  '"company": string, "startDate": string, "endDate": string, ' +
  '"description": string}], "education": [{"school": string, "degree": ' +
  'string, "year": string}], "skills": string[]}. Use empty string/array ' +
  'values for anything not present in the text.';

function parseExtractedContent(raw: string): ResumeContent {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain JSON.');
  }
  const parsed = JSON.parse(jsonMatch[0]) as Partial<ResumeContent>;
  return {
    fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
    headline: typeof parsed.headline === 'string' ? parsed.headline : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    experience: Array.isArray(parsed.experience)
      ? parsed.experience.map((entry) => ({
          title: entry?.title ?? '',
          company: entry?.company ?? '',
          startDate: entry?.startDate ?? '',
          endDate: entry?.endDate ?? '',
          description: entry?.description ?? '',
        }))
      : [],
    education: Array.isArray(parsed.education)
      ? parsed.education.map((entry) => ({
          school: entry?.school ?? '',
          degree: entry?.degree ?? '',
          year: entry?.year ?? '',
        }))
      : [],
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.filter((s): s is string => typeof s === 'string')
      : [],
  };
}

function h(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildMatchEmailHtml(matches: { job: { title: string; company: string; workplace_city?: string | null }; matchedSkills: string[] }[]): string {
  const rows = matches
    .map(({ job, matchedSkills }) => {
      const url = `${config.url}/jobs/${generateJobSlug(job.title, job.company)}`;
      return `<li style="margin-bottom:12px;">
        <a href="${h(url)}" style="font-weight:600;color:#18181b;text-decoration:none;">${h(job.title)}</a>
        <div style="color:#71717a;font-size:13px;">${h(job.company)}${job.workplace_city ? ` &middot; ${h(job.workplace_city)}` : ''}</div>
        <div style="color:#a1a1aa;font-size:12px;">Matches: ${matchedSkills.map(h).join(', ')}</div>
      </li>`;
    })
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#18181b;">${matches.length} job${matches.length > 1 ? 's' : ''} match the skills on your resume</h2>
      <p style="color:#71717a;">Based on the resume you just uploaded to ${h(config.title)}.</p>
      <ul style="list-style:none;padding:0;">${rows}</ul>
      <p><a href="${h(config.url)}" style="color:#18181b;">Browse all jobs</a></p>
      <p style="color:#a1a1aa;font-size:12px;">You&rsquo;re receiving this because you uploaded a resume on ${h(config.title)}.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'Only PDF resumes are supported right now.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: 'File is too large (max 4MB).' },
      { status: 400 }
    );
  }

  let rawText: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buffer);
    rawText = parsed.text.trim();
  } catch (error) {
    console.error('[api/seeker/resume/upload] PDF parsing failed:', error);
    return NextResponse.json(
      { error: "Couldn't read that PDF. Try a different file." },
      { status: 400 }
    );
  }

  if (!rawText) {
    return NextResponse.json(
      { error: "That PDF didn't contain any extractable text." },
      { status: 400 }
    );
  }

  let content: ResumeContent;
  try {
    const output = await aiChatCompletion(
      [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: rawText.slice(0, 8000) },
      ],
      { temperature: 0.1, maxTokens: 1500 }
    );
    content = parseExtractedContent(output);
  } catch (error) {
    if (error instanceof AIProviderError && error.notConfigured) {
      return NextResponse.json(
        { error: 'Resume parsing is not available yet on this deployment.' },
        { status: 503 }
      );
    }
    console.error('[api/seeker/resume/upload] AI extraction failed:', error);
    return NextResponse.json(
      { error: "Couldn't parse that resume. Try again." },
      { status: 502 }
    );
  }

  const resume = await saveSeekerResume(session.user.id, content);

  let matches: { jobId: string; title: string; company: string; matchedSkills: string[] }[] = [];
  if (content.skills.length > 0) {
    try {
      const jobs = await getJobs();
      const scored = matchJobsBySkills(jobs, content.skills, MAX_MATCHES);
      matches = scored.map(({ job, matchedSkills }) => ({
        jobId: job.id,
        title: job.title,
        company: job.company,
        matchedSkills,
      }));

      if (scored.length > 0 && session.user.email) {
        await sendEmail({
          to: session.user.email,
          subject: `${scored.length} job${scored.length > 1 ? 's' : ''} match the skills on your resume`,
          html: buildMatchEmailHtml(scored),
        });
        await markSeekerResumeMatched(
          session.user.id,
          scored.map(({ job }) => job.id)
        );
      }
    } catch (error) {
      // Matching/email failure shouldn't block the resume having been saved.
      console.error('[api/seeker/resume/upload] Matching/email failed:', error);
    }
  }

  return NextResponse.json({ resume, matches });
}
