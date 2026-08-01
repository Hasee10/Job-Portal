import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { ResumeContent } from '@/lib/jobs/resume-actions';
import type { JobOwner } from '@/lib/jobs/employer-job-actions';
import { scoreJobMatch } from '@/lib/jobs/match-scoring';

export type ApplicationStatus = 'new' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';

export type JobApplication = {
  id: string;
  jobId: string;
  seekerId: string;
  resumeSnapshot: ResumeContent;
  coverLetter: string | null;
  status: ApplicationStatus;
  matchScore: number;
  autoShortlisted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationWithSeeker = JobApplication & {
  seekerName: string | null;
  seekerEmail: string;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Supabase/PostgREST errors are plain objects, not `instanceof Error` - a
// bare `throw error` on one of those gets silently discarded by any catch
// block that does `error instanceof Error ? error.message : 'fallback'`,
// which is exactly how the job_applications table-name collision stayed
// invisible: the real Postgres error ("column does not exist") never made
// it past that check. Wrapping here means the real message always survives.
function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  const message = (error as { message?: string } | null)?.message;
  return new Error(message || fallback);
}

function rowToApplication(row: Record<string, unknown>): JobApplication {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    seekerId: row.seeker_id as string,
    resumeSnapshot: row.resume_snapshot as ResumeContent,
    coverLetter: (row.cover_letter as string) || null,
    status: row.status as ApplicationStatus,
    matchScore: (row.match_score as number) ?? 0,
    autoShortlisted: Boolean(row.auto_shortlisted),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function submitApplication(
  seekerId: string,
  jobId: string,
  input: { resumeSnapshot: ResumeContent; coverLetter: string | null }
): Promise<JobApplication> {
  const supabase = getAdminClient();

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(
      'id, title, description, accepts_applications, required_skills, auto_shortlist_threshold, is_active'
    )
    .eq('id', jobId)
    .maybeSingle();

  if (jobError) throw toError(jobError, 'Failed to look up job.');
  if (!job || !job.is_active || !job.accepts_applications) {
    throw new Error('This job is not accepting applications.');
  }

  const requiredSkills = (job.required_skills as string[]) || [];
  const match = await scoreJobMatch(input.resumeSnapshot, {
    title: job.title as string,
    description: job.description as string | null,
    skills: requiredSkills,
  });
  const matchScore = match.score;
  const threshold = (job.auto_shortlist_threshold as number) ?? 70;
  // Auto-shortlisting only fires when the employer/recruiter has actually
  // configured required skills. With no criteria set, the score defaults to
  // 100 for everyone (so no one is unfairly penalized) - but that would
  // otherwise auto-shortlist every single applicant regardless of fit,
  // which isn't a real signal and shouldn't bypass manual review.
  const autoShortlisted = requiredSkills.length > 0 && matchScore >= threshold;

  const { data, error } = await supabase
    .from('job_application_submissions')
    .insert({
      job_id: jobId,
      seeker_id: seekerId,
      resume_snapshot: input.resumeSnapshot,
      cover_letter: input.coverLetter,
      match_score: matchScore,
      auto_shortlisted: autoShortlisted,
      status: autoShortlisted ? 'shortlisted' : 'new',
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already applied to this job.');
    }
    throw toError(error, 'Failed to submit application.');
  }

  return rowToApplication(data);
}

export async function listJobApplications(
  owner: JobOwner,
  jobId: string
): Promise<ApplicationWithSeeker[]> {
  const supabase = getAdminClient();
  const ownerColumn = owner.employerId !== undefined ? 'employer_id' : 'recruiter_id';
  const ownerIdValue = owner.employerId ?? (owner.recruiterId as string);

  // Scope to the owner's own job - a stray jobId for someone else's
  // listing returns nothing rather than leaking applicant data.
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq(ownerColumn, ownerIdValue)
    .maybeSingle();
  if (!job) return [];

  const { data, error } = await supabase
    .from('job_application_submissions')
    .select('*, job_seekers(name, email)')
    .eq('job_id', jobId)
    .order('match_score', { ascending: false });

  if (error) throw toError(error, 'Failed to load applications.');

  return (data ?? []).map((row) => {
    const seeker = row.job_seekers as Record<string, unknown> | null;
    return {
      ...rowToApplication(row),
      seekerName: (seeker?.name as string) || null,
      seekerEmail: (seeker?.email as string) ?? '',
    };
  });
}

export async function updateApplicationStatus(
  owner: JobOwner,
  applicationId: string,
  status: ApplicationStatus
): Promise<JobApplication> {
  const supabase = getAdminClient();
  const ownerColumn = owner.employerId !== undefined ? 'employer_id' : 'recruiter_id';
  const ownerIdValue = owner.employerId ?? (owner.recruiterId as string);

  // Verify the application belongs to one of this owner's jobs before
  // allowing the status change.
  const { data: application } = await supabase
    .from('job_application_submissions')
    .select(`id, job_id, jobs!inner(${ownerColumn})`)
    .eq('id', applicationId)
    .eq(`jobs.${ownerColumn}`, ownerIdValue)
    .maybeSingle();

  if (!application) throw new Error('Application not found.');

  const { data, error } = await supabase
    .from('job_application_submissions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .select('*')
    .single();

  if (error) throw toError(error, 'Failed to update application.');
  return rowToApplication(data);
}

export async function hasSeekerApplied(seekerId: string, jobId: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('job_application_submissions')
    .select('id')
    .eq('seeker_id', seekerId)
    .eq('job_id', jobId)
    .maybeSingle();
  return Boolean(data);
}
