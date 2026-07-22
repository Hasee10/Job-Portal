import type { Job } from '@/lib/db/airtable';

const TAG_SPLIT_REGEX = /[,;\n]+/;

function splitSkills(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(TAG_SPLIT_REGEX)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export type ResumeJobMatch = {
  job: Job;
  matchedSkills: string[];
};

// Overlaps the seeker's resume skills against each job's Airtable `skills`
// field (the same free-text field the job detail page already splits into
// tags) - no AI involved here, just real listing data.
export function matchJobsBySkills(
  jobs: Job[],
  seekerSkills: string[],
  limit = 10
): ResumeJobMatch[] {
  const normalizedSeekerSkills = new Map(
    seekerSkills.map((skill) => [skill.trim().toLowerCase(), skill.trim()])
  );
  if (normalizedSeekerSkills.size === 0) return [];

  const scored: ResumeJobMatch[] = [];
  for (const job of jobs) {
    const jobSkills = splitSkills(job.skills);
    if (jobSkills.length === 0) continue;

    const matchedSkills = jobSkills.filter((skill) =>
      normalizedSeekerSkills.has(skill.trim().toLowerCase())
    );
    if (matchedSkills.length === 0) continue;

    scored.push({ job, matchedSkills });
  }

  scored.sort((a, b) => b.matchedSkills.length - a.matchedSkills.length);
  return scored.slice(0, limit);
}
