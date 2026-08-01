import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { computeSkillsOverlapScore } from '@/lib/jobs/match-scoring';

export type JobCandidate = {
  seekerId: string;
  name: string | null;
  email: string;
  headline: string | null;
  skills: string[];
  matchScore: number;
  createdAt: string;
  inviteStatus: 'pending' | 'read' | 'accepted' | 'declined' | null;
};

export type EmployerInvite = {
  id: string;
  employerId: string;
  jobId: string;
  seekerId: string;
  message: string;
  status: 'pending' | 'read' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt: string | null;
};

export type InviteWithJob = EmployerInvite & {
  jobTitle: string;
  companyName: string | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToInvite(row: Record<string, unknown>): EmployerInvite {
  return {
    id: row.id as string,
    employerId: row.employer_id as string,
    jobId: row.job_id as string,
    seekerId: row.seeker_id as string,
    message: row.message as string,
    status: row.status as EmployerInvite['status'],
    createdAt: row.created_at as string,
    respondedAt: (row.responded_at as string) || null,
  };
}

// Opted-in seekers ranked by skill overlap with the given job's required
// skills - reuses the same scoring function applications are scored with,
// so "match %" means the same thing everywhere in the employer dashboard.
export async function searchCandidatesForJob(
  employerId: string,
  jobId: string,
  opts: { searchTerm?: string } = {}
): Promise<JobCandidate[]> {
  const supabase = getAdminClient();

  const { data: job } = await supabase
    .from('jobs')
    .select('required_skills')
    .eq('id', jobId)
    .eq('employer_id', employerId)
    .maybeSingle();
  if (!job) return [];
  const requiredSkills = (job.required_skills as string[]) || [];

  const { data: seekers, error } = await supabase
    .from('job_seekers')
    .select('id, name, email, headline, created_at')
    .eq('open_to_recruiters', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!seekers || seekers.length === 0) return [];

  const seekerIds = seekers.map((s) => s.id as string);

  const { data: resumes } = await supabase
    .from('seeker_resumes')
    .select('seeker_id, content')
    .in('seeker_id', seekerIds);

  const resumeMap = new Map<string, string[]>();
  for (const r of resumes ?? []) {
    const skills = (r.content as { skills?: string[] })?.skills ?? [];
    resumeMap.set(r.seeker_id as string, skills);
  }

  const { data: inviteRows } = await supabase
    .from('employer_candidate_invites')
    .select('seeker_id, status')
    .eq('employer_id', employerId)
    .eq('job_id', jobId)
    .in('seeker_id', seekerIds);

  const inviteMap = new Map<string, string>();
  for (const row of inviteRows ?? []) {
    inviteMap.set(row.seeker_id as string, row.status as string);
  }

  let candidates: JobCandidate[] = seekers.map((s) => {
    const skills = resumeMap.get(s.id as string) ?? [];
    return {
      seekerId: s.id as string,
      name: (s.name as string) || null,
      email: s.email as string,
      headline: (s.headline as string) || null,
      skills,
      matchScore: computeSkillsOverlapScore(skills, requiredSkills),
      createdAt: s.created_at as string,
      inviteStatus: (inviteMap.get(s.id as string) ?? null) as JobCandidate['inviteStatus'],
    };
  });

  if (opts.searchTerm) {
    const term = opts.searchTerm.toLowerCase();
    candidates = candidates.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.headline?.toLowerCase().includes(term) ||
        c.skills.some((s) => s.toLowerCase().includes(term))
    );
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);
  return candidates;
}

export async function sendEmployerInvite(
  employerId: string,
  jobId: string,
  seekerId: string,
  message: string
): Promise<EmployerInvite> {
  const supabase = getAdminClient();

  const { data: seeker } = await supabase
    .from('job_seekers')
    .select('open_to_recruiters')
    .eq('id', seekerId)
    .maybeSingle();

  if (!seeker || !seeker.open_to_recruiters) {
    throw new Error('This candidate is not open to outreach.');
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('employer_id', employerId)
    .maybeSingle();
  if (!job) throw new Error('Job not found.');

  const { data, error } = await supabase
    .from('employer_candidate_invites')
    .insert({ employer_id: employerId, job_id: jobId, seeker_id: seekerId, message })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already invited this candidate to this job.');
    }
    throw error;
  }

  return rowToInvite(data);
}

export async function getEmployerDailyInviteCount(employerId: string): Promise<number> {
  const supabase = getAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('employer_candidate_invites')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .gte('created_at', since);
  return count ?? 0;
}

export async function listSeekerInvites(seekerId: string): Promise<InviteWithJob[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('employer_candidate_invites')
    .select('*, jobs(title, company)')
    .eq('seeker_id', seekerId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const job = row.jobs as Record<string, unknown> | null;
    return {
      ...rowToInvite(row),
      jobTitle: (job?.title as string) || 'A job',
      companyName: (job?.company as string) || null,
    };
  });
}

export async function markInviteRead(inviteId: string, seekerId: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase
    .from('employer_candidate_invites')
    .update({ status: 'read' })
    .eq('id', inviteId)
    .eq('seeker_id', seekerId)
    .eq('status', 'pending');
}

export async function respondToInvite(
  inviteId: string,
  seekerId: string,
  response: 'accepted' | 'declined'
): Promise<EmployerInvite> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('employer_candidate_invites')
    .update({ status: response, responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('seeker_id', seekerId)
    .in('status', ['pending', 'read'])
    .select('*')
    .single();

  if (error) throw error;
  return rowToInvite(data);
}

export async function getSeekerUnreadInviteCount(seekerId: string): Promise<number> {
  const supabase = getAdminClient();
  const { count } = await supabase
    .from('employer_candidate_invites')
    .select('id', { count: 'exact', head: true })
    .eq('seeker_id', seekerId)
    .eq('status', 'pending');
  return count ?? 0;
}
