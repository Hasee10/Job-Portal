import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type JobSeeker = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  // True only on the request that first creates the row - detected by
  // comparing created_at (DB default, set once) against the updated_at we
  // just wrote (always "now"). On a genuine insert those land within
  // milliseconds of each other; on every later login updated_at is far
  // newer than the original created_at.
  isNew: boolean;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Called from the OAuth signIn callback on every login, not just the first
// one - keeps name/avatar in sync with the provider (e.g. a changed Google
// profile photo) without needing a separate "update profile" path.
export async function upsertJobSeeker(profile: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string;
  providerAccountId: string;
}): Promise<JobSeeker> {
  const supabase = getAdminClient();
  const normalizedEmail = profile.email.trim().toLowerCase();

  const updatedAt = new Date();

  const { data, error } = await supabase
    .from('job_seekers')
    .upsert(
      {
        email: normalizedEmail,
        name: profile.name,
        avatar_url: profile.avatarUrl,
        provider: profile.provider,
        provider_account_id: profile.providerAccountId,
        updated_at: updatedAt.toISOString(),
      },
      { onConflict: 'email' }
    )
    .select('id, email, name, avatar_url, created_at')
    .single();

  if (error) throw error;

  const createdAt = new Date(data.created_at as string);
  const isNew = Math.abs(updatedAt.getTime() - createdAt.getTime()) < 5000;

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    avatarUrl: data.avatar_url,
    isNew,
  };
}
