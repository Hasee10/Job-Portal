import "server-only";

import { createClient } from "@supabase/supabase-js";
import { TENDER_CATEGORIES } from "./tender-categories";

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
  if (!(url && key)) {
    throw new Error("Database is not configured on this deployment.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToTender(row: Record<string, unknown>): ScrapedTenderRow {
  return {
    buyerName: (row.buyer_name as string) || null,
    country: (row.country as string) || null,
    cpvCodes: (row.cpv_codes as string[]) || [],
    deadlineDate: (row.deadline_date as string) || null,
    id: row.id as string,
    publicationDate: (row.publication_date as string) || null,
    source: row.source as string,
    title: row.title as string,
    url: row.url as string,
  };
}

// Raised from 500 once a real faceted sidebar needed correct counts/paging
// over the full active set (1,900+ rows today) rather than just the most
// recent slice - still a bounded window, not an unbounded query, appropriate
// at this table's scale (a few hundred new rows/day).
const FETCH_WINDOW = 3000;

export type TenderSort = "newest" | "deadline";

export type TenderListOpts = {
  categories?: string[]; // CPV prefixes, e.g. ['72', '45']
  sources?: string[]; // e.g. ['ted', 'ppra']
  countries?: string[]; // ISO3 codes
  query?: string; // keyword, matched against title + buyer name
  sort?: TenderSort;
  page?: number;
  perPage?: number;
};

// Supabase's PostgREST layer caps any single response at its own
// server-side max-rows setting (1000, confirmed empirically via the
// Content-Range response header - a plain .limit(3000) is silently
// clamped, it does not raise an error). Paginating with .range() in
// 1000-row pages is required to actually reach FETCH_WINDOW.
const POSTGREST_PAGE_SIZE = 1000;

// Category/query filtering happens in JS over a bounded recent window
// rather than in SQL - cpv_codes are full 8-digit codes (e.g. "72413000")
// and category filtering is by 2-digit division prefix, which PostgREST's
// array-contains filter can't express directly, and free-text query needs
// a substring match across two columns. Matches the same fetch-then-filter
// pattern already used for candidate search in
// lib/jobs/candidate-outreach-actions.ts.
//
// source/country DO get pushed into the SQL query below (via .in()) rather
// than filtered here in JS, specifically so they don't share this
// limitation: with 63k+ active rows overwhelmingly from one source (TED),
// a global newest-3000 window filtered afterward in JS could easily miss
// most or all of a smaller source's own active tenders - confirmed live,
// an unordered 1000-row fetch returned 100% TED and 0% PPRA even though
// PPRA had active rows. Filtering source/country in SQL first means the
// window is over the complete matching set for that filter, not an
// arbitrary slice of the whole table.
//
// The ordering is still load-bearing even with that fix: it's what makes
// an unfiltered (or category/query-only) window deterministically "most
// recent", rather than whatever scan order Postgres happens to produce.
async function fetchActiveWindow(
  filters: { sources?: string[]; countries?: string[] } = {}
): Promise<ScrapedTenderRow[]> {
  const supabase = getAdminClient();
  const rows: Record<string, unknown>[] = [];

  for (let offset = 0; offset < FETCH_WINDOW; offset += POSTGREST_PAGE_SIZE) {
    let query = supabase
      .from("scraped_tenders")
      .select("*")
      .eq("is_active", true);
    if (filters.sources && filters.sources.length > 0) {
      query = query.in("source", filters.sources);
    }
    if (filters.countries && filters.countries.length > 0) {
      query = query.in("country", filters.countries);
    }
    const { data, error } = await query
      .order("publication_date", { ascending: false, nullsFirst: false })
      .range(offset, Math.min(offset + POSTGREST_PAGE_SIZE, FETCH_WINDOW) - 1);

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }
    rows.push(...data);
    if (data.length < POSTGREST_PAGE_SIZE) {
      break; // last page
    }
  }

  return rows.map(rowToTender);
}

function applyFilters(
  tenders: ScrapedTenderRow[],
  opts: TenderListOpts
): ScrapedTenderRow[] {
  let result = tenders;

  if (opts.categories && opts.categories.length > 0) {
    const categories = opts.categories;
    result = result.filter((t) =>
      t.cpvCodes.some((code) => categories.some((c) => code.startsWith(c)))
    );
  }
  if (opts.query && opts.query.trim()) {
    const q = opts.query.trim().toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.buyerName ?? "").toLowerCase().includes(q)
    );
  }

  return result;
}

function sortTenders(
  tenders: ScrapedTenderRow[],
  sort: TenderSort
): ScrapedTenderRow[] {
  const sorted = [...tenders];
  if (sort === "deadline") {
    sorted.sort((a, b) => {
      if (!a.deadlineDate) {
        return 1;
      }
      if (!b.deadlineDate) {
        return -1;
      }
      return (
        new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime()
      );
    });
  } else {
    sorted.sort((a, b) => {
      const aDate = a.publicationDate
        ? new Date(a.publicationDate).getTime()
        : 0;
      const bDate = b.publicationDate
        ? new Date(b.publicationDate).getTime()
        : 0;
      return bDate - aDate;
    });
  }
  return sorted;
}

export async function listActiveTenders(
  opts: TenderListOpts
): Promise<{ tenders: ScrapedTenderRow[]; total: number }> {
  const all = await fetchActiveWindow({
    countries: opts.countries,
    sources: opts.sources,
  });
  const filtered = applyFilters(all, opts);
  const sorted = sortTenders(filtered, opts.sort ?? "newest");

  const total = sorted.length;
  const perPage = opts.perPage ?? 20;
  const page = opts.page ?? 1;
  const start = (page - 1) * perPage;

  return { tenders: sorted.slice(start, start + perPage), total };
}

export type TenderFacets = {
  categories: { cpvPrefix: string; label: string; count: number }[];
  sources: { source: string; count: number }[];
  countries: { code: string; count: number }[];
};

// Facet counts are computed against the full active window regardless of
// which filters are currently applied - the simpler, more common faceted-
// search convention (counts answer "how many tenders have this attribute"
// rather than "how many would match if I also kept my other filters"),
// and correct at this data volume without a second, filter-aware query.
export async function getTenderFacets(): Promise<TenderFacets> {
  const all = await fetchActiveWindow();

  const categories = TENDER_CATEGORIES.map((c) => ({
    count: all.filter((t) =>
      t.cpvCodes.some((code) => code.startsWith(c.cpvPrefix))
    ).length,
    cpvPrefix: c.cpvPrefix,
    label: c.label,
  }));

  const sourceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  for (const t of all) {
    sourceCounts.set(t.source, (sourceCounts.get(t.source) ?? 0) + 1);
    if (t.country) {
      countryCounts.set(t.country, (countryCounts.get(t.country) ?? 0) + 1);
    }
  }

  const sources = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ count, source }))
    .sort((a, b) => b.count - a.count);

  const countries = Array.from(countryCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  return { categories, countries, sources };
}
