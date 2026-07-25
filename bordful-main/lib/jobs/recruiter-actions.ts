import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type Recruiter = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  specialties: string[];
  avatarUrl: string | null;
};

export type RecruiterRequest = {
  id: string;
  seekerId: string;
  recruiterId: string | null;
  message: string;
  status: 'pending' | 'contacted' | 'closed';
  createdAt: string;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToRecruiter(row: Record<string, unknown>): Recruiter {
  return {
    id: row.id as string,
    name: row.name as string,
    title: (row.title as string) || null,
    company: (row.company as string) || null,
    bio: (row.bio as string) || null,
    specialties: (row.specialties as string[]) || [],
    avatarUrl: (row.avatar_url as string) || null,
  };
}

// Returns admin-seeded recruiters plus verified self-serve recruiter accounts.
export async function listActiveRecruiters(): Promise<Recruiter[]> {
  const supabase = getAdminClient();

  const [legacyResult, accountsResult] = await Promise.all([
    supabase.from('recruiters').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('recruiter_accounts').select('*').eq('is_verified', true).order('created_at', { ascending: false }),
  ]);

  if (legacyResult.error) throw legacyResult.error;

  const legacy = (legacyResult.data ?? []).map(rowToRecruiter);
  const accounts = (accountsResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    title: null,
    company: (row.agency as string) || null,
    bio: (row.bio as string) || null,
    specialties: (row.specialties as string[]) || [],
    avatarUrl: null,
  }));

  return [...legacy, ...accounts];
}

export async function createRecruiterRequest(
  seekerId: string,
  input: { recruiterId: string | null; message: string }
): Promise<RecruiterRequest> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('recruiter_requests')
    .insert({
      seeker_id: seekerId,
      recruiter_id: input.recruiterId,
      message: input.message,
    })
    .select('*')
    .single();

  if (error) throw error;
  return {
    id: data.id as string,
    seekerId: data.seeker_id as string,
    recruiterId: (data.recruiter_id as string) || null,
    message: data.message as string,
    status: data.status as RecruiterRequest['status'],
    createdAt: data.created_at as string,
  };
}
