import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type ScrapedTenderRow = {
  id: string;
  source: string;
  title: string;
  buyerName: string | null;
  country: string | null;
  cpvCodes: string[];
  publicationDate: string | null;
  deadlineDate: string | null;
  url: string;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToTender(row: Record<string, unknown>): ScrapedTenderRow {
  return {
    id: row.id as string,
    source: row.source as string,
    title: row.title as string,
    buyerName: (row.buyer_name as string) || null,
    country: (row.country as string) || null,
    cpvCodes: (row.cpv_codes as string[]) || [],
    publicationDate: (row.publication_date as string) || null,
    deadlineDate: (row.deadline_date as string) || null,
    url: row.url as string,
  };
}

const FETCH_WINDOW = 500; // recent active tenders considered for filtering - fine at current volume

// Category/country filtering happens in JS over a bounded recent window
// rather than in SQL - cpv_codes are full 8-digit codes (e.g. "72413000")
// and category filtering is by 2-digit division prefix, which PostgREST's
// array-contains filter can't express directly. Matches the same
// fetch-then-filter pattern already used for candidate search in
// lib/jobs/candidate-outreach-actions.ts, appropriate at this table's
// current scale (a few hundred new rows/day).
export async function listActiveTenders(opts: {
  cpvPrefix?: string;
  country?: string;
  page?: number;
  perPage?: number;
}): Promise<{ tenders: ScrapedTenderRow[]; total: number }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('scraped_tenders')
    .select('*')
    .eq('is_active', true)
    .order('publication_date', { ascending: false })
    .limit(FETCH_WINDOW);

  if (error) throw error;

  let tenders = (data ?? []).map(rowToTender);

  if (opts.cpvPrefix) {
    tenders = tenders.filter((t) => t.cpvCodes.some((code) => code.startsWith(opts.cpvPrefix as string)));
  }
  if (opts.country) {
    tenders = tenders.filter((t) => t.country === opts.country);
  }

  const total = tenders.length;
  const perPage = opts.perPage ?? 20;
  const page = opts.page ?? 1;
  const start = (page - 1) * perPage;

  return { tenders: tenders.slice(start, start + perPage), total };
}

export async function listTenderCountries(): Promise<string[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('scraped_tenders')
    .select('country')
    .eq('is_active', true)
    .not('country', 'is', null)
    .limit(FETCH_WINDOW);

  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.country as string))).sort();
}
