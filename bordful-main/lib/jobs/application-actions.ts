import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { ResumeContent } from '@/lib/jobs/resume-actions';

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

// Percentage overlap between a resume's skills and a job's required skills.
// No required skills set means every applicant scores 100 - the employer
// hasn't opted into auto-shortlisting criteria, so nothing gets auto-flagged
// out based on a signal they never configured.
export function computeMatchScore(resumeSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 100;
  const normalizedResumeSkills = new Set(resumeSkills.map((s) => s.trim().toLowerCase()));
  const matched = requiredSkills.filter((s) => normalizedResumeSkills.has(s.trim().toLowerCase()));
  return Math.round((matched.length / requiredSkills.length) * 100);
}

export async function submitApplication(
  seekerId: string,
  jobId: string,
  input: { resumeSnapshot: ResumeContent; coverLetter: string | null }
): Promise<JobApplication> {
  const supabase = getAdminClient();

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, accepts_applications, required_skills, auto_shortlist_threshold, is_active')
    .eq('id', jobId)
    .maybeSingle();

  if (jobError) throw jobError;
  if (!job || !job.is_active || !job.accepts_applications) {
    throw new Error('This job is not accepting applications.');
  }

  const matchScore = computeMatchScore(
    input.resumeSnapshot.skills,
    (job.required_skills as string[]) || []
  );
  const threshold = (job.auto_shortlist_threshold as number) ?? 70;
  const autoShortlisted = matchScore >= threshold;

  const { data, error } = await supabase
    .from('job_applications')
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
    throw error;
  }

  return rowToApplication(data);
}

export async function listJobApplications(
  employerId: string,
  jobId: string
): Promise<ApplicationWithSeeker[]> {
  const supabase = getAdminClient();

  // Scope to the employer's own job - a stray jobId for someone else's
  // listing returns nothing rather than leaking applicant data.
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('employer_id', employerId)
    .maybeSingle();
  if (!job) return [];

  const { data, error } = await supabase
    .from('job_applications')
    .select('*, job_seekers(name, email)')
    .eq('job_id', jobId)
    .order('match_score', { ascending: false });

  if (error) throw error;

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
  employerId: string,
  applicationId: string,
  status: ApplicationStatus
): Promise<JobApplication> {
  const supabase = getAdminClient();

  // Verify the application belongs to one of this employer's jobs before
  // allowing the status change.
  const { data: application } = await supabase
    .from('job_applications')
    .select('id, job_id, jobs!inner(employer_id)')
    .eq('id', applicationId)
    .eq('jobs.employer_id', employerId)
    .maybeSingle();

  if (!application) throw new Error('Application not found.');

  const { data, error } = await supabase
    .from('job_applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .select('*')
    .single();

  if (error) throw error;
  return rowToApplication(data);
}

export async function hasSeekerApplied(seekerId: string, jobId: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('job_applications')
    .select('id')
    .eq('seeker_id', seekerId)
    .eq('job_id', jobId)
    .maybeSingle();
  return Boolean(data);
}
