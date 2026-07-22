import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getSavedSearchLimit } from '@/lib/entitlements';
import { getSeekerTier } from '@/lib/jobs/entitlements-actions';
import {
  DEFAULT_SAVED_SEARCH_FILTERS,
  type SavedSearchFilters,
} from '@/lib/jobs/saved-search-matching';

export type SavedSearchFrequency = 'daily' | 'weekly';

export type SavedSearch = {
  id: string;
  seekerId: string;
  name: string;
  searchTerm: string | null;
  filters: SavedSearchFilters;
  frequency: SavedSearchFrequency;
  lastNotifiedAt: string | null;
  notifiedJobIds: string[];
  createdAt: string;
};

export type SavedSearchForNotification = SavedSearch & { seekerEmail: string };

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToSavedSearch(row: Record<string, unknown>): SavedSearch {
  return {
    id: row.id as string,
    seekerId: row.seeker_id as string,
    name: row.name as string,
    searchTerm: (row.search_term as string) || null,
    filters: {
      ...DEFAULT_SAVED_SEARCH_FILTERS,
      ...((row.filters as Partial<SavedSearchFilters>) || {}),
    },
    frequency: row.frequency as SavedSearchFrequency,
    lastNotifiedAt: (row.last_notified_at as string) || null,
    notifiedJobIds: (row.notified_job_ids as string[]) || [],
    createdAt: row.created_at as string,
  };
}

export async function listSavedSearches(
  seekerId: string
): Promise<SavedSearch[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('seeker_id', seekerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToSavedSearch);
}

export async function createSavedSearch(
  seekerId: string,
  input: {
    name: string;
    searchTerm: string | null;
    filters: SavedSearchFilters;
    frequency: SavedSearchFrequency;
  }
): Promise<SavedSearch> {
  const supabase = getAdminClient();

  const [tier, countResult] = await Promise.all([
    getSeekerTier(seekerId),
    supabase
      .from('saved_searches')
      .select('*', { count: 'exact', head: true })
      .eq('seeker_id', seekerId),
  ]);
  if (countResult.error) throw countResult.error;

  const limit = getSavedSearchLimit(tier);
  if ((countResult.count ?? 0) >= limit) {
    throw new Error(
      tier === 'free'
        ? `Free plan is limited to ${limit} saved searches. Upgrade to Premium for more (coming soon).`
        : `You can save up to ${limit} searches.`
    );
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      seeker_id: seekerId,
      name: input.name,
      search_term: input.searchTerm,
      filters: input.filters,
      frequency: input.frequency,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToSavedSearch(data);
}

export async function deleteSavedSearch(
  seekerId: string,
  id: string
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('seeker_id', seekerId)
    .eq('id', id);
  if (error) throw error;
}

// Used by the alert cron job - pulls every saved search due for the given
// frequency along with the owning seeker's email for delivery.
export async function listSavedSearchesForNotification(
  frequency: SavedSearchFrequency
): Promise<SavedSearchForNotification[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*, job_seekers(email)')
    .eq('frequency', frequency);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.job_seekers?.email)
    .map((row) => ({
      ...rowToSavedSearch(row),
      seekerEmail: (row.job_seekers as { email: string }).email,
    }));
}

const MAX_NOTIFIED_JOB_IDS = 500;

export async function markSavedSearchNotified(
  id: string,
  notifiedJobIds: string[]
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('saved_searches')
    .update({
      last_notified_at: new Date().toISOString(),
      notified_job_ids: notifiedJobIds.slice(-MAX_NOTIFIED_JOB_IDS),
    })
    .eq('id', id);
  if (error) throw error;
}
