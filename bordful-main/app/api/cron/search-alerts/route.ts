import { NextResponse } from "next/server";
import config from "@/config";
import type { Job } from "@/lib/db/airtable";
import { getJobs } from "@/lib/db/airtable.server";
import { sendEmail } from "@/lib/email/smtp";
import {
  type JobMatchDigestRow,
  renderJobMatchDigestEmail,
} from "@/lib/email/templates/job-match-digest";
import { renderRecruiterCandidateDigestEmail } from "@/lib/email/templates/recruiter-candidate-digest";
import {
  findNewCandidatesForRecruiter,
  listRecruitersForCandidateDigest,
  markCandidateDigestSent,
} from "@/lib/jobs/candidate-outreach-actions";
import { scoreJobMatch } from "@/lib/jobs/match-scoring";
import type { ResumeContent } from "@/lib/jobs/resume-actions";
import {
  listSeekerResumesForMatching,
  markSeekerResumeMatched,
} from "@/lib/jobs/resume-actions";
import {
  matchJobsBySkills,
  type ResumeJobMatch,
  splitSkills,
} from "@/lib/jobs/resume-matching";
import {
  listSavedSearchesForNotification,
  markSavedSearchNotified,
  type SavedSearchFrequency,
} from "@/lib/jobs/saved-search-actions";
import { matchesSavedSearch } from "@/lib/jobs/saved-search-matching";
import { generateJobSlug } from "@/lib/utils/slugify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_JOBS_PER_EMAIL = 15;

function jobToDigestRow(job: Job, detail: string): JobMatchDigestRow {
  return {
    city: job.workplace_city,
    company: job.company,
    detail,
    title: job.title,
    url: `${config.url}/jobs/${generateJobSlug(job.title, job.company)}`,
  };
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
      if (alreadyNotified.has(job.id)) {
        return false;
      }
      if (new Date(job.posted_date) <= cutoff) {
        return false;
      }
      return matchesSavedSearch(job, search.filters, search.searchTerm);
    });

    if (matches.length === 0) {
      continue;
    }

    try {
      const { subject, html } = renderJobMatchDigestEmail({
        browseUrl: config.url,
        contextLine: `Based on your saved search on ${config.title}.`,
        headline: `${matches.length} new job${matches.length > 1 ? "s" : ""} match "${search.name}"`,
        matches: matches
          .slice(0, MAX_JOBS_PER_EMAIL)
          .map((job) => jobToDigestRow(job, "")),
        reasonForReceiving: "you saved this search",
      });
      await sendEmail({
        html,
        subject,
        to: search.seekerEmail,
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
// AI scoring is one model call per job - bounded to the top few overlap
// matches per seeker so a run with many subscribers can't blow the cron's
// maxDuration. The rest still show in the email with the plain skill list.
const MAX_AI_SCORED_MATCHES_PER_EMAIL = 3;

function resumeMatchToDigestRow(match: ResumeJobMatch): JobMatchDigestRow {
  const { job, matchedSkills, aiScore, aiReasoning } = match;
  const detail =
    aiScore === undefined
      ? `Matches: ${matchedSkills.join(", ")}`
      : `${aiScore}% match${aiReasoning ? ` — ${aiReasoning}` : ""}`;
  return jobToDigestRow(job, detail);
}

// Mutates the top few matches in place, adding an AI fit score/reasoning.
// Sequential and capped (not Promise.all across all matches) so one slow
// seeker's resume can't fan out into dozens of concurrent AI calls across
// a run with many subscribers.
async function enrichTopMatchesWithAiScore(
  matches: ResumeJobMatch[],
  resume: ResumeContent
): Promise<void> {
  for (const match of matches.slice(0, MAX_AI_SCORED_MATCHES_PER_EMAIL)) {
    const result = await scoreJobMatch(resume, {
      description: match.job.description,
      skills: splitSkills(match.job.skills),
      title: match.job.title,
    });
    if (result.method === "ai") {
      match.aiScore = result.score;
      match.aiReasoning = result.reasoning;
    }
  }
}

async function processResumeMatches(jobs: Job[]): Promise<number> {
  const resumes = await listSeekerResumesForMatching();
  let sent = 0;

  for (const resume of resumes) {
    const alreadyMatched = new Set(resume.matchedJobIds);
    const cutoff = resume.lastMatchedAt ? new Date(resume.lastMatchedAt) : null;

    const eligibleJobs = jobs.filter((job) => {
      if (alreadyMatched.has(job.id)) {
        return false;
      }
      if (cutoff && new Date(job.posted_date) <= cutoff) {
        return false;
      }
      return true;
    });

    const scored = matchJobsBySkills(
      eligibleJobs,
      resume.content.skills,
      MAX_RESUME_MATCHES_PER_EMAIL
    );
    if (scored.length === 0) {
      continue;
    }

    await enrichTopMatchesWithAiScore(scored, resume.content);

    try {
      const { subject, html } = renderJobMatchDigestEmail({
        browseUrl: config.url,
        contextLine: `Based on the resume you uploaded to ${config.title}.`,
        headline: `${scored.length} new job${scored.length > 1 ? "s" : ""} match your resume skills`,
        matches: scored.map(resumeMatchToDigestRow),
        reasonForReceiving: "you uploaded a resume",
      });
      await sendEmail({
        html,
        subject,
        to: resume.seekerEmail,
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

const MAX_CANDIDATES_PER_DIGEST = 10;

async function processRecruiterCandidateDigests(): Promise<number> {
  const recruiters = await listRecruitersForCandidateDigest();
  let sent = 0;

  for (const recruiter of recruiters) {
    const candidates = await findNewCandidatesForRecruiter(
      recruiter.id,
      recruiter.specialties,
      recruiter.lastCandidateDigestAt
    );
    if (candidates.length === 0) {
      continue;
    }

    try {
      const { subject, html } = renderRecruiterCandidateDigestEmail({
        browseUrl: `${process.env.NEXTAUTH_URL ?? ""}/recruiter/dashboard`,
        candidates: candidates.slice(0, MAX_CANDIDATES_PER_DIGEST).map((c) => ({
          headline: c.headline,
          matchScore: c.matchScore,
          name: c.name || "A candidate",
          skills: c.skills,
        })),
        recruiterName: recruiter.name,
      });
      await sendEmail({ html, subject, to: recruiter.email });
      await markCandidateDigestSent(recruiter.id);
      sent++;
    } catch (error) {
      console.error(
        `[cron/search-alerts] Failed to notify recruiter ${recruiter.id} of new candidates:`,
        error
      );
    }
  }

  return sent;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await getJobs();

  // Weekly digests are folded into the Monday run of this same daily cron
  // rather than a second scheduled job.
  const isWeeklyRunDay = new Date().getUTCDay() === 1;
  const frequencies: SavedSearchFrequency[] = isWeeklyRunDay
    ? ["daily", "weekly"]
    : ["daily"];

  let totalSent = 0;
  for (const frequency of frequencies) {
    totalSent += await processFrequency(frequency, jobs);
  }
  totalSent += await processResumeMatches(jobs);
  totalSent += await processRecruiterCandidateDigests();

  return NextResponse.json({ ok: true, sent: totalSent });
}
