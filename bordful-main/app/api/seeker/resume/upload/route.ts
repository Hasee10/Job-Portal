import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AIProviderError } from '@/lib/ai/types';
import { getJobs } from '@/lib/db/airtable.server';
import config from '@/config';
import { markSeekerResumeMatched, saveSeekerResume } from '@/lib/jobs/resume-actions';
import { extractResumeFromPdf } from '@/lib/jobs/resume-extraction';
import { matchJobsBySkills } from '@/lib/jobs/resume-matching';
import { sendEmail } from '@/lib/email/smtp';
import { generateJobSlug } from '@/lib/utils/slugify';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_MATCHES = 10;

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

  let content;
  try {
    content = await extractResumeFromPdf(file);
  } catch (error) {
    if (error instanceof AIProviderError && error.notConfigured) {
      return NextResponse.json(
        { error: 'Resume parsing is not available yet on this deployment.' },
        { status: 503 }
      );
    }
    console.error('[api/seeker/resume/upload] Resume extraction failed:', error);
    const message = error instanceof Error ? error.message : "Couldn't parse that resume. Try again.";
    return NextResponse.json({ error: message }, { status: 400 });
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
