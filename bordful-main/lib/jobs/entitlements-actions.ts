import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getResumeTailorLimit, type SeekerTier } from '@/lib/entitlements';

const RESUME_TAILOR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getSeekerTier(seekerId: string): Promise<SeekerTier> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('job_seekers')
    .select('tier')
    .eq('id', seekerId)
    .maybeSingle();
  if (error) throw error;
  return (data?.tier as SeekerTier) || 'free';
}

// Checks the seeker's monthly resume-tailoring quota and atomically
// increments it if they're still under the limit. Premium is unlimited so
// this is a no-op read for premium seekers.
export async function checkAndIncrementResumeTailorUsage(
  seekerId: string
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('job_seekers')
    .select('tier, resume_tailor_count, resume_tailor_reset_at')
    .eq('id', seekerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { allowed: false, limit: 0, remaining: 0 };

  const tier = (data.tier as SeekerTier) || 'free';
  const limit = getResumeTailorLimit(tier);
  if (!Number.isFinite(limit)) {
    return { allowed: true, limit, remaining: limit };
  }

  const resetAt = new Date(data.resume_tailor_reset_at as string);
  const windowExpired = Date.now() - resetAt.getTime() > RESUME_TAILOR_WINDOW_MS;
  const currentCount = windowExpired ? 0 : (data.resume_tailor_count as number);

  if (currentCount >= limit) {
    return { allowed: false, limit, remaining: 0 };
  }

  const { error: updateError } = await supabase
    .from('job_seekers')
    .update({
      resume_tailor_count: currentCount + 1,
      resume_tailor_reset_at: windowExpired
        ? new Date().toISOString()
        : (data.resume_tailor_reset_at as string),
    })
    .eq('id', seekerId);
  if (updateError) throw updateError;

  return { allowed: true, limit, remaining: limit - (currentCount + 1) };
}
