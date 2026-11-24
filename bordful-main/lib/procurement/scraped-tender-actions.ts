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

// Quote the PostgREST literal and escape LIKE metacharacters so user input
// remains a literal substring, including commas, percent and underscores.
function keywordPattern(value: string): string {
  return JSON.stringify(`%${value.replace(/[\\%_*]/g, "\\$&")}%`);
}

// Every filter is applied in the database and windowed with range() before
// anything reaches this process - no step here fetches more than one page
// of rows, regardless of how many tenders are active.
//
// Category filtering used to need a full-table fetch into JavaScript: CPV
// codes are full 8-digit codes, and matching a 2-digit division prefix
// isn't expressible through PostgREST's query operators against that
// column. migrations/20261113_scraped_tenders_facets_performance.sql adds
// cpv_divisions, a trigger-maintained, GIN-indexed text[] of exactly the
// 2-digit divisions each tender's codes fall into, so a category filter is
// now a plain, indexed array-overlap predicate like the existing
// source/country filters - no separate code path, no JS-side scan.
export async function listActiveTenders(
  opts: TenderListOpts
): Promise<{ tenders: ScrapedTenderRow[]; total: number }> {
  const client = getAdminClient();
  let query = client
    .from("scraped_tenders")
    .select(
      "id,source,title,buyer_name,country,cpv_codes,publication_date,deadline_date,url",
      { count: "exact" }
    )
    .eq("is_active", true);
  if (opts.sources?.length) {
    query = query.in("source", opts.sources);
  }
  if (opts.countries?.length) {
    query = query.in("country", opts.countries);
  }
  if (opts.categories?.length) {
    query = query.overlaps("cpv_divisions", opts.categories);
  }
  if (opts.query?.trim()) {
    const pattern = keywordPattern(opts.query.trim());
    query = query.or(`title.ilike.${pattern},buyer_name.ilike.${pattern}`);
  }
  const perPage = opts.perPage ?? 20;
  const start = ((opts.page ?? 1) - 1) * perPage;
  const deadline = opts.sort === "deadline";
  const { data, error, count } = await query
    .order(deadline ? "deadline_date" : "publication_date", {
      ascending: deadline,
      nullsFirst: false,
    })
    .order("id")
    .range(start, start + perPage - 1);
  if (error) {
    throw error;
  }
  return { tenders: (data ?? []).map(rowToTender), total: count ?? 0 };
}

export async function getActiveTenderCount(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("scraped_tenders")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export type TenderFacets = {
  categories: { cpvPrefix: string; label: string; count: number }[];
  sources: { source: string; count: number }[];
  countries: { code: string; count: number }[];
};

// Global facets cover all active records, independently of current filters -
// the sidebar always shows every option with its true count, not just the
// ones that survive the current filter selection.
//
// One round trip, computed entirely in Postgres by
// scraped_tender_facets(): previously this called getActiveIndex(), which
// paginated id/source/country/cpv_codes for every active row (tens of
// thousands in production) into this process and grouped them in
// JavaScript on every single page view. That function and the full-table
// fetch it depended on are gone; the database does the grouping and sends
// back only the handful of rows this function needs.
export async function getTenderFacets(): Promise<TenderFacets> {
  const categoryPrefixes = TENDER_CATEGORIES.map((c) => c.cpvPrefix);
  const { data, error } = await getAdminClient().rpc("scraped_tender_facets", {
    category_prefixes: categoryPrefixes,
  });
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as { kind: string; key: string; cnt: number }[];
  const countBy = (kind: string) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.kind === kind) {
        counts.set(row.key, Number(row.cnt));
      }
    }
    return counts;
  };

  const categoryCounts = countBy("category");
  const categories = TENDER_CATEGORIES.map((c) => ({
    count: categoryCounts.get(c.cpvPrefix) ?? 0,
    cpvPrefix: c.cpvPrefix,
    label: c.label,
  }));

  const sources = rows
    .filter((row) => row.kind === "source")
    .map((row) => ({ count: Number(row.cnt), source: row.key }))
    .sort((a, b) => b.count - a.count);

  const countries = rows
    .filter((row) => row.kind === "country")
    .map((row) => ({ code: row.key, count: Number(row.cnt) }))
    .sort((a, b) => b.count - a.count);

  return { categories, countries, sources };
}
