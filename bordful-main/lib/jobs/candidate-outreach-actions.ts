import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { computeSkillsOverlapScore } from '@/lib/jobs/match-scoring';

export type CandidateOutreach = {
  id: string;
  recruiterId: string;
  seekerId: string;
  jobId: string | null;
  message: string;
  status: 'pending' | 'read' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt: string | null;
};

export type OutreachWithRecruiter = CandidateOutreach & {
  recruiterName: string;
  recruiterAgency: string | null;
  recruiterBio: string | null;
  recruiterSpecialties: string[];
  recruiterLinkedinUrl: string | null;
};

export type OutreachWithSeeker = CandidateOutreach & {
  seekerName: string | null;
  seekerEmail: string;
  seekerHeadline: string | null;
  seekerSkills: string[];
  jobTitle: string | null;
};

export type OptInCandidate = {
  seekerId: string;
  name: string | null;
  email: string;
  headline: string | null;
  skills: string[];
  matchScore: number;
  createdAt: string;
  outreachStatus: 'pending' | 'read' | 'accepted' | 'declined' | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Seekers who have opted in and their outreach status for this recruiter.
// When jobId is provided, candidates are scored/ranked against that job's
// required skills (same scoring used for employer applications) and
// outreachStatus reflects invites for that specific job rather than any
// general outreach.
export async function listOptInCandidates(
  recruiterId: string,
  opts: { skills?: string[]; searchTerm?: string; jobId?: string } = {}
): Promise<OptInCandidate[]> {
  const supabase = getAdminClient();

  let requiredSkills: string[] = [];
  if (opts.jobId) {
    const { data: job } = await supabase
      .from('jobs')
      .select('required_skills')
      .eq('id', opts.jobId)
      .eq('recruiter_id', recruiterId)
      .maybeSingle();
    requiredSkills = (job?.required_skills as string[]) || [];
  }

  // Fetch opt-in seekers with their resumes and any outreach this recruiter sent
  const { data: seekers, error } = await supabase
    .from('job_seekers')
    .select('id, name, email, headline, created_at')
    .eq('open_to_recruiters', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!seekers || seekers.length === 0) return [];

  const seekerIds = seekers.map((s) => s.id as string);

  // Fetch resumes for skill data
  const { data: resumes } = await supabase
    .from('seeker_resumes')
    .select('seeker_id, content')
    .in('seeker_id', seekerIds);

  const resumeMap = new Map<string, string[]>();
  for (const r of resumes ?? []) {
    const skills = (r.content as { skills?: string[] })?.skills ?? [];
    resumeMap.set(r.seeker_id as string, skills);
  }

  // Fetch this recruiter's outreach to these seekers, scoped to the job
  // when one is given, otherwise general (job_id null) outreach.
  let outreachQuery = supabase
    .from('candidate_outreach')
    .select('seeker_id, status')
    .eq('recruiter_id', recruiterId)
    .in('seeker_id', seekerIds);
  outreachQuery = opts.jobId ? outreachQuery.eq('job_id', opts.jobId) : outreachQuery.is('job_id', null);
  const { data: outreachRows } = await outreachQuery;

  const outreachMap = new Map<string, string>();
  for (const row of outreachRows ?? []) {
    outreachMap.set(row.seeker_id as string, row.status as string);
  }

  let candidates: OptInCandidate[] = seekers.map((s) => {
    const skills = resumeMap.get(s.id as string) ?? [];
    return {
      seekerId: s.id as string,
      name: (s.name as string) || null,
      email: s.email as string,
      headline: (s.headline as string) || null,
      skills,
      matchScore: computeSkillsOverlapScore(skills, requiredSkills),
      createdAt: s.created_at as string,
      outreachStatus: (outreachMap.get(s.id as string) ?? null) as OptInCandidate['outreachStatus'],
    };
  });

  // Filter by skills if provided
  if (opts.skills && opts.skills.length > 0) {
    const filterSkills = opts.skills.map((s) => s.toLowerCase());
    candidates = candidates.filter((c) =>
      filterSkills.some((fs) =>
        c.skills.some((cs) => cs.toLowerCase().includes(fs))
      )
    );
  }

  // Filter by search term against name / headline / skills
  if (opts.searchTerm) {
    const term = opts.searchTerm.toLowerCase();
    candidates = candidates.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.headline?.toLowerCase().includes(term) ||
        c.skills.some((s) => s.toLowerCase().includes(term))
    );
  }

  if (opts.jobId) {
    candidates.sort((a, b) => b.matchScore - a.matchScore);
  }

  return candidates;
}

// Send outreach from a recruiter to a seeker — verifies the seeker has
// opted in before inserting, so the API cannot be abused by posting
// arbitrary seeker IDs directly. jobId is optional: general outreach (no
// job) vs an invite to apply to a specific posted job.
export async function sendOutreach(
  recruiterId: string,
  seekerId: string,
  message: string,
  jobId: string | null = null
): Promise<CandidateOutreach> {
  const supabase = getAdminClient();

  // Verify the seeker actually opted in
  const { data: seeker } = await supabase
    .from('job_seekers')
    .select('open_to_recruiters')
    .eq('id', seekerId)
    .maybeSingle();

  if (!seeker || !seeker.open_to_recruiters) {
    throw new Error('This candidate is not open to recruiter outreach.');
  }

  const { data, error } = await supabase
    .from('candidate_outreach')
    .insert({ recruiter_id: recruiterId, seeker_id: seekerId, message, job_id: jobId })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already sent a request to this candidate.');
    }
    throw error;
  }

  return rowToOutreach(data);
}

// How many outreach messages this recruiter sent in the last 24 hours
export async function getRecruiterDailyOutreachCount(
  recruiterId: string
): Promise<number> {
  const supabase = getAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('candidate_outreach')
    .select('id', { count: 'exact', head: true })
    .eq('recruiter_id', recruiterId)
    .gte('created_at', since);
  return count ?? 0;
}

// Recruiter's sent outreach with seeker info
export async function listRecruiterOutreach(
  recruiterId: string
): Promise<OutreachWithSeeker[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('candidate_outreach')
    .select('*, job_seekers(name, email, headline), jobs(title)')
    .eq('recruiter_id', recruiterId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const seekerIds = (data ?? []).map((r) => r.seeker_id as string);
  const { data: resumes } = seekerIds.length
    ? await supabase
        .from('seeker_resumes')
        .select('seeker_id, content')
        .in('seeker_id', seekerIds)
    : { data: [] };

  const resumeMap = new Map<string, string[]>();
  for (const r of resumes ?? []) {
    const skills = (r.content as { skills?: string[] })?.skills ?? [];
    resumeMap.set(r.seeker_id as string, skills);
  }

  return (data ?? []).map((row) => {
    const seeker = row.job_seekers as Record<string, unknown> | null;
    const job = row.jobs as Record<string, unknown> | null;
    return {
      ...rowToOutreach(row),
      seekerName: (seeker?.name as string) || null,
      seekerEmail: (seeker?.email as string) ?? '',
      seekerHeadline: (seeker?.headline as string) || null,
      seekerSkills: resumeMap.get(row.seeker_id as string) ?? [],
      jobTitle: (job?.title as string) || null,
    };
  });
}

// Seeker's inbox — messages received from recruiters
export async function listSeekerInbox(
  seekerId: string
): Promise<OutreachWithRecruiter[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('candidate_outreach')
    .select('*, recruiter_accounts(name, agency, bio, specialties, linkedin_url)')
    .eq('seeker_id', seekerId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row.recruiter_accounts as Record<string, unknown> | null;
    return {
      ...rowToOutreach(row),
      recruiterName: (r?.name as string) ?? 'Unknown',
      recruiterAgency: (r?.agency as string) || null,
      recruiterBio: (r?.bio as string) || null,
      recruiterSpecialties: (r?.specialties as string[]) || [],
      recruiterLinkedinUrl: (r?.linkedin_url as string) || null,
    };
  });
}

// Mark an outreach as read when the seeker opens it
export async function markOutreachRead(
  outreachId: string,
  seekerId: string
): Promise<void> {
  const supabase = getAdminClient();
  await supabase
    .from('candidate_outreach')
    .update({ status: 'read' })
    .eq('id', outreachId)
    .eq('seeker_id', seekerId)
    .eq('status', 'pending');
}

// Seeker responds to recruiter outreach
export async function respondToOutreach(
  outreachId: string,
  seekerId: string,
  response: 'accepted' | 'declined'
): Promise<CandidateOutreach> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('candidate_outreach')
    .update({
      status: response,
      responded_at: new Date().toISOString(),
    })
    .eq('id', outreachId)
    .eq('seeker_id', seekerId)
    .in('status', ['pending', 'read'])
    .select('*')
    .single();

  if (error) throw error;
  return rowToOutreach(data);
}

// Unread inbox count for seeker badge
export async function getSeekerUnreadCount(seekerId: string): Promise<number> {
  const supabase = getAdminClient();
  const { count } = await supabase
    .from('candidate_outreach')
    .select('id', { count: 'exact', head: true })
    .eq('seeker_id', seekerId)
    .eq('status', 'pending');
  return count ?? 0;
}

export type RecruiterForDigest = {
  id: string;
  email: string;
  name: string;
  specialties: string[];
  lastCandidateDigestAt: string | null;
};

// Recruiters eligible for the new-candidates digest: verified, with at least
// one specialty to match against (an empty specialty list can't produce a
// meaningful "matching candidates" email).
export async function listRecruitersForCandidateDigest(): Promise<RecruiterForDigest[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('recruiter_accounts')
    .select('id, email, name, specialties, last_candidate_digest_at')
    .eq('is_verified', true);

  if (error) throw error;

  return (data ?? [])
    .filter((r) => Array.isArray(r.specialties) && r.specialties.length > 0)
    .map((r) => ({
      id: r.id as string,
      email: r.email as string,
      name: r.name as string,
      specialties: r.specialties as string[],
      lastCandidateDigestAt: (r.last_candidate_digest_at as string) || null,
    }));
}

export type NewMatchingCandidate = {
  seekerId: string;
  name: string | null;
  headline: string | null;
  skills: string[];
  matchScore: number;
};

// Opt-in seekers created since the recruiter's last digest, scored against
// the recruiter's specialties (used as a stand-in for "required skills"
// since a digest isn't scoped to one job posting). Excludes seekers this
// recruiter has already reached out to, general or job-scoped.
export async function findNewCandidatesForRecruiter(
  recruiterId: string,
  specialties: string[],
  since: string | null
): Promise<NewMatchingCandidate[]> {
  const supabase = getAdminClient();

  let query = supabase
    .from('job_seekers')
    .select('id, name, headline, created_at')
    .eq('open_to_recruiters', true)
    .order('created_at', { ascending: false });
  if (since) query = query.gt('created_at', since);

  const { data: seekers, error } = await query;
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

  const { data: alreadyContacted } = await supabase
    .from('candidate_outreach')
    .select('seeker_id')
    .eq('recruiter_id', recruiterId)
    .in('seeker_id', seekerIds);
  const contactedSet = new Set((alreadyContacted ?? []).map((r) => r.seeker_id as string));

  const candidates: NewMatchingCandidate[] = seekers
    .filter((s) => !contactedSet.has(s.id as string))
    .map((s) => {
      const skills = resumeMap.get(s.id as string) ?? [];
      return {
        seekerId: s.id as string,
        name: (s.name as string) || null,
        headline: (s.headline as string) || null,
        skills,
        matchScore: computeSkillsOverlapScore(skills, specialties),
      };
    })
    .filter((c) => c.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  return candidates;
}

export async function markCandidateDigestSent(recruiterId: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase
    .from('recruiter_accounts')
    .update({ last_candidate_digest_at: new Date().toISOString() })
    .eq('id', recruiterId);
}

function rowToOutreach(row: Record<string, unknown>): CandidateOutreach {
  return {
    id: row.id as string,
    recruiterId: row.recruiter_id as string,
    seekerId: row.seeker_id as string,
    jobId: (row.job_id as string) || null,
    message: row.message as string,
    status: row.status as CandidateOutreach['status'],
    createdAt: row.created_at as string,
    respondedAt: (row.responded_at as string) || null,
  };
}
