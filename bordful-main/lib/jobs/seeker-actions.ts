import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type ApplicationStatus = 'applied' | 'not_interested';

export type SeekerJobState = {
  savedJobIds: string[];
  applications: Record<string, ApplicationStatus>;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Single round trip for hydrating the UI (job cards + account page both
// need "is this job saved / what's its application status" for many jobs
// at once) rather than a per-card query.
export async function getSeekerJobState(
  seekerId: string
): Promise<SeekerJobState> {
  const supabase = getAdminClient();

  const [savedResult, applicationsResult] = await Promise.all([
    supabase.from('saved_jobs').select('job_id').eq('seeker_id', seekerId),
    supabase
      .from('job_applications')
      .select('job_id, status')
      .eq('seeker_id', seekerId),
  ]);

  if (savedResult.error) throw savedResult.error;
  if (applicationsResult.error) throw applicationsResult.error;

  const applications: Record<string, ApplicationStatus> = {};
  for (const row of applicationsResult.data ?? []) {
    applications[row.job_id] = row.status as ApplicationStatus;
  }

  return {
    savedJobIds: (savedResult.data ?? []).map((row) => row.job_id),
    applications,
  };
}

export async function saveJob(seekerId: string, jobId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('saved_jobs')
    .upsert(
      { seeker_id: seekerId, job_id: jobId },
      { onConflict: 'seeker_id,job_id', ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function unsaveJob(
  seekerId: string,
  jobId: string
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('saved_jobs')
    .delete()
    .eq('seeker_id', seekerId)
    .eq('job_id', jobId);
  if (error) throw error;
}

export async function setApplicationStatus(
  seekerId: string,
  jobId: string,
  status: ApplicationStatus
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from('job_applications').upsert(
    {
      seeker_id: seekerId,
      job_id: jobId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'seeker_id,job_id' }
  );
  if (error) throw error;
}

export async function clearApplicationStatus(
  seekerId: string,
  jobId: string
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('job_applications')
    .delete()
    .eq('seeker_id', seekerId)
    .eq('job_id', jobId);
  if (error) throw error;
}

export type SavedJobWithDetails = {
  jobId: string;
  savedAt: string;
  title: string;
  company: string | null;
  applyUrl: string;
};

export async function getSavedJobsWithDetails(
  seekerId: string
): Promise<SavedJobWithDetails[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('saved_jobs')
    .select('job_id, created_at, jobs(title, company, apply_url)')
    .eq('seeker_id', seekerId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.jobs)
    .map((row) => {
      const job = row.jobs as unknown as {
        title: string;
        company: string | null;
        apply_url: string;
      };
      return {
        jobId: row.job_id,
        savedAt: row.created_at,
        title: job.title,
        company: job.company,
        applyUrl: job.apply_url,
      };
    });
}
