import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_SAVED_SEARCH_FILTERS,
  type SavedSearchFilters,
} from '@/lib/jobs/saved-search-matching';

export type SeekerProfile = {
  seekerId: string;
  searchTerm: string | null;
  filters: SavedSearchFilters;
  onboardingCompletedAt: string | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToProfile(row: Record<string, unknown>): SeekerProfile {
  return {
    seekerId: row.seeker_id as string,
    searchTerm: (row.search_term as string) || null,
    filters: {
      ...DEFAULT_SAVED_SEARCH_FILTERS,
      ...((row.filters as Partial<SavedSearchFilters>) || {}),
    },
    onboardingCompletedAt: (row.onboarding_completed_at as string) || null,
  };
}

export async function getSeekerProfile(
  seekerId: string
): Promise<SeekerProfile | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('seeker_profiles')
    .select('*')
    .eq('seeker_id', seekerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToProfile(data);
}

export async function saveSeekerProfile(
  seekerId: string,
  input: { searchTerm: string | null; filters: SavedSearchFilters }
): Promise<SeekerProfile> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('seeker_profiles')
    .upsert(
      {
        seeker_id: seekerId,
        search_term: input.searchTerm,
        filters: input.filters,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'seeker_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return rowToProfile(data);
}
