import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/smtp';
import { getJobs } from '@/lib/db/airtable.server';
import config from '@/config';
import type { Job } from '@/lib/db/airtable';
import {
  listSavedSearchesForNotification,
  markSavedSearchNotified,
  type SavedSearchForNotification,
  type SavedSearchFrequency,
} from '@/lib/jobs/saved-search-actions';
import { matchesSavedSearch } from '@/lib/jobs/saved-search-matching';
import {
  listSeekerResumesForMatching,
  markSeekerResumeMatched,
} from '@/lib/jobs/resume-actions';
import { matchJobsBySkills } from '@/lib/jobs/resume-matching';
import { generateJobSlug } from '@/lib/utils/slugify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_JOBS_PER_EMAIL = 15;

function h(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmailHtml(
  search: SavedSearchForNotification,
  matches: Job[]
): string {
  const rows = matches
    .slice(0, MAX_JOBS_PER_EMAIL)
    .map((job) => {
      const url = `${config.url}/jobs/${generateJobSlug(job.title, job.company)}`;
      return `<li style="margin-bottom:12px;">
        <a href="${h(url)}" style="font-weight:600;color:#18181b;text-decoration:none;">${h(job.title)}</a>
        <div style="color:#71717a;font-size:13px;">${h(job.company)}${job.workplace_city ? ` &middot; ${h(job.workplace_city)}` : ''}</div>
      </li>`;
    })
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#18181b;">${matches.length} new job${matches.length > 1 ? 's' : ''} match &ldquo;${h(search.name)}&rdquo;</h2>
      <p style="color:#71717a;">Based on your saved search on ${h(config.title)}.</p>
      <ul style="list-style:none;padding:0;">${rows}</ul>
      <p><a href="${h(config.url)}" style="color:#18181b;">Browse all jobs</a></p>
      <p style="color:#a1a1aa;font-size:12px;">You&rsquo;re receiving this because you saved this search on ${h(config.title)}. Manage your saved searches from your account page.</p>
    </div>
  `;
}

async function processFrequency(
  frequency: SavedSearchFrequency,
  jobs: Job[]
): Promise<number> {
  const searches = await listSavedSearchesForNotification(frequency);
  let sent = 0;

  for (const search of searches) {
    const cutoff = new Date(search.lastNotifiedAt || search.createdAt);
    const alreadyNotified = new Set(search.notifiedJobIds);

    const matches = jobs.filter((job) => {
      if (alreadyNotified.has(job.id)) return false;
      if (new Date(job.posted_date) <= cutoff) return false;
      return matchesSavedSearch(job, search.filters, search.searchTerm);
    });

    if (matches.length === 0) continue;

    try {
      await sendEmail({
        to: search.seekerEmail,
        subject: `${matches.length} new job${matches.length > 1 ? 's' : ''} matching "${search.name}"`,
        html: buildEmailHtml(search, matches),
      });
      await markSavedSearchNotified(search.id, [
        ...search.notifiedJobIds,
        ...matches.map((job) => job.id),
      ]);
      sent++;
    } catch (error) {
      console.error(
        `[cron/search-alerts] Failed to notify saved search ${search.id}:`,
        error
      );
    }
  }

  return sent;
}

const MAX_RESUME_MATCHES_PER_EMAIL = 10;

function buildResumeMatchEmailHtml(matches: { job: Job; matchedSkills: string[] }[]): string {
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
      <h2 style="color:#18181b;">${matches.length} new job${matches.length > 1 ? 's' : ''} match your resume skills</h2>
      <p style="color:#71717a;">Based on the resume you uploaded to ${h(config.title)}.</p>
      <ul style="list-style:none;padding:0;">${rows}</ul>
      <p><a href="${h(config.url)}" style="color:#18181b;">Browse all jobs</a></p>
      <p style="color:#a1a1aa;font-size:12px;">You&rsquo;re receiving this because you uploaded a resume on ${h(config.title)}.</p>
    </div>
  `;
}

async function processResumeMatches(jobs: Job[]): Promise<number> {
  const resumes = await listSeekerResumesForMatching();
  let sent = 0;

  for (const resume of resumes) {
    const alreadyMatched = new Set(resume.matchedJobIds);
    const cutoff = resume.lastMatchedAt ? new Date(resume.lastMatchedAt) : null;

    const eligibleJobs = jobs.filter((job) => {
      if (alreadyMatched.has(job.id)) return false;
      if (cutoff && new Date(job.posted_date) <= cutoff) return false;
      return true;
    });

    const scored = matchJobsBySkills(
      eligibleJobs,
      resume.content.skills,
      MAX_RESUME_MATCHES_PER_EMAIL
    );
    if (scored.length === 0) continue;

    try {
      await sendEmail({
        to: resume.seekerEmail,
        subject: `${scored.length} new job${scored.length > 1 ? 's' : ''} match your resume skills`,
        html: buildResumeMatchEmailHtml(scored),
      });
      await markSeekerResumeMatched(resume.seekerId, [
        ...resume.matchedJobIds,
        ...scored.map(({ job }) => job.id),
      ]);
      sent++;
    } catch (error) {
      console.error(
        `[cron/search-alerts] Failed to notify resume matches for seeker ${resume.seekerId}:`,
        error
      );
    }
  }

  return sent;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobs = await getJobs();

  // Weekly digests are folded into the Monday run of this same daily cron
  // rather than a second scheduled job.
  const isWeeklyRunDay = new Date().getUTCDay() === 1;
  const frequencies: SavedSearchFrequency[] = isWeeklyRunDay
    ? ['daily', 'weekly']
    : ['daily'];

  let totalSent = 0;
  for (const frequency of frequencies) {
    totalSent += await processFrequency(frequency, jobs);
  }
  totalSent += await processResumeMatches(jobs);

  return NextResponse.json({ ok: true, sent: totalSent });
}
