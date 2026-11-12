import "server-only";

import { cache } from "react";
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

// Shared only within a server render. Full coverage is necessary for CPV prefix
// facets: the existing schema has arrays of full codes, not division columns.
const getActiveIndex = cache(async (): Promise<ScrapedTenderRow[]> => {
  const rows: ScrapedTenderRow[] = [];
  const client = getAdminClient();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("scraped_tenders")
      .select("id,source,country,cpv_codes")
      .eq("is_active", true)
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []).map(rowToTender));
    if (!data || data.length < 1000) break;
  }
  return rows;
});

// Quote the PostgREST literal and escape LIKE metacharacters so user input
// remains a literal substring, including commas, percent and underscores.
function keywordPattern(value: string): string {
  return JSON.stringify(`%${value.replace(/[\\%_*]/g, "\\$&")}%`);
}

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
  if (opts.sources?.length) query = query.in("source", opts.sources);
  if (opts.countries?.length) query = query.in("country", opts.countries);
  if (opts.query?.trim()) {
    const pattern = keywordPattern(opts.query.trim());
    query = query.or(`title.ilike.${pattern},buyer_name.ilike.${pattern}`);
  }
  // CPV prefix matching is not expressible with PostgREST array containment.
  // Scan the shared narrow index, then restrict SQL by exact full CPV codes.
  if (opts.categories?.length) {
    const index = await getActiveIndex();
    return listCategoryTenders(opts, index);
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
  if (error) throw error;
  return { tenders: (data ?? []).map(rowToTender), total: count ?? 0 };
}

async function listCategoryTenders(
  opts: TenderListOpts,
  index: ScrapedTenderRow[]
) {
  const ids = index
    .filter(
      (row) =>
        (!opts.sources?.length || opts.sources.includes(row.source)) &&
        (!opts.countries?.length ||
          opts.countries.includes(row.country ?? "")) &&
        row.cpvCodes.some((code) =>
          opts.categories?.some((prefix) => code.startsWith(prefix))
        )
    )
    .map((row) => row.id);
  const rows: ScrapedTenderRow[] = [];
  const client = getAdminClient();
  for (let offset = 0; offset < ids.length; offset += 100) {
    let query = client
      .from("scraped_tenders")
      .select("id,title,buyer_name,publication_date,deadline_date")
      .eq("is_active", true)
      .in("id", ids.slice(offset, offset + 100));
    if (opts.query?.trim()) {
      const pattern = keywordPattern(opts.query.trim());
      query = query.or(`title.ilike.${pattern},buyer_name.ilike.${pattern}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []).map(rowToTender));
  }
  const deadline = opts.sort === "deadline";
  rows.sort((a, b) => {
    const left = deadline ? a.deadlineDate : a.publicationDate;
    const right = deadline ? b.deadlineDate : b.publicationDate;
    if (!left && !right) return a.id.localeCompare(b.id);
    if (!left) return 1;
    if (!right) return -1;
    return (
      (deadline ? left.localeCompare(right) : right.localeCompare(left)) ||
      a.id.localeCompare(b.id)
    );
  });
  const perPage = opts.perPage ?? 20;
  const start = ((opts.page ?? 1) - 1) * perPage;
  const pageIds = rows.slice(start, start + perPage).map((row) => row.id);
  if (!pageIds.length) return { tenders: [], total: rows.length };
  const { data, error } = await client
    .from("scraped_tenders")
    .select(
      "id,source,title,buyer_name,country,cpv_codes,publication_date,deadline_date,url"
    )
    .in("id", pageIds);
  if (error) throw error;
  const byId = new Map((data ?? []).map((row) => [row.id, rowToTender(row)]));
  return {
    tenders: pageIds.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    }),
    total: rows.length,
  };
}

export async function getActiveTenderCount(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("scraped_tenders")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
}

export type TenderFacets = {
  categories: { cpvPrefix: string; label: string; count: number }[];
  sources: { source: string; count: number }[];
  countries: { code: string; count: number }[];
};

// Global facets cover all active records, independently of current filters.
export async function getTenderFacets(): Promise<TenderFacets> {
  const all = await getActiveIndex();

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
