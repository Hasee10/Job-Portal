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

// Only active, admin-approved recruiters are shown publicly - the table is
// seeded by hand for now, there's no self-serve recruiter signup yet.
export async function listActiveRecruiters(): Promise<Recruiter[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('recruiters')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToRecruiter);
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
