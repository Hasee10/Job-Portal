import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type CandidateOutreach = {
  id: string;
  recruiterId: string;
  seekerId: string;
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
};

export type OptInCandidate = {
  seekerId: string;
  name: string | null;
  email: string;
  headline: string | null;
  skills: string[];
  createdAt: string;
  outreachStatus: 'pending' | 'read' | 'accepted' | 'declined' | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Seekers who have opted in and their outreach status for this recruiter
export async function listOptInCandidates(
  recruiterId: string,
  opts: { skills?: string[]; searchTerm?: string } = {}
): Promise<OptInCandidate[]> {
  const supabase = getAdminClient();

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

  // Fetch this recruiter's outreach to these seekers
  const { data: outreachRows } = await supabase
    .from('candidate_outreach')
    .select('seeker_id, status')
    .eq('recruiter_id', recruiterId)
    .in('seeker_id', seekerIds);

  const outreachMap = new Map<string, string>();
  for (const row of outreachRows ?? []) {
    outreachMap.set(row.seeker_id as string, row.status as string);
  }

  let candidates: OptInCandidate[] = seekers.map((s) => ({
    seekerId: s.id as string,
    name: (s.name as string) || null,
    email: s.email as string,
    headline: (s.headline as string) || null,
    skills: resumeMap.get(s.id as string) ?? [],
    createdAt: s.created_at as string,
    outreachStatus: (outreachMap.get(s.id as string) ?? null) as OptInCandidate['outreachStatus'],
  }));

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

  return candidates;
}

// Send outreach from a recruiter to a seeker
export async function sendOutreach(
  recruiterId: string,
  seekerId: string,
  message: string
): Promise<CandidateOutreach> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('candidate_outreach')
    .insert({ recruiter_id: recruiterId, seeker_id: seekerId, message })
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

// Recruiter's sent outreach with seeker info
export async function listRecruiterOutreach(
  recruiterId: string
): Promise<OutreachWithSeeker[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('candidate_outreach')
    .select('*, job_seekers(name, email, headline)')
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
    return {
      ...rowToOutreach(row),
      seekerName: (seeker?.name as string) || null,
      seekerEmail: (seeker?.email as string) ?? '',
      seekerHeadline: (seeker?.headline as string) || null,
      seekerSkills: resumeMap.get(row.seeker_id as string) ?? [],
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

function rowToOutreach(row: Record<string, unknown>): CandidateOutreach {
  return {
    id: row.id as string,
    recruiterId: row.recruiter_id as string,
    seekerId: row.seeker_id as string,
    message: row.message as string,
    status: row.status as CandidateOutreach['status'],
    createdAt: row.created_at as string,
    respondedAt: (row.responded_at as string) || null,
  };
}
