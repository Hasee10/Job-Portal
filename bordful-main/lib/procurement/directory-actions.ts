import "server-only";

import { createClient } from "@supabase/supabase-js";

// Public marketplace directory. Deliberately a separate module from
// organization-actions.ts: everything here is readable without a session, so
// the projection below is the single place that decides what leaves the
// database for an anonymous caller. Nothing in this file selects
// organization_members, legacy employer/vendor ids, or any procurement
// record.

export interface PublicOrganization {
  categories: string[];
  companySize: string | null;
  description: string | null;
  id: string;
  industry: string | null;
  isBuyer: boolean;
  isSupplier: boolean;
  location: string | null;
  name: string;
  operatingRegions: string[];
  productsServices: string | null;
  publicContactEmail: string | null;
  website: string | null;
}

export type DirectoryCapability = "all" | "buyer" | "supplier";

export interface DirectoryFilters {
  capability: DirectoryCapability;
  category: string;
  page: number;
  q: string;
  region: string;
}

export interface DirectoryPage {
  organizations: PublicOrganization[];
  page: number;
  pageCount: number;
  total: number;
}

export const DIRECTORY_PAGE_SIZE = 12;

// The exact column list that may reach an anonymous caller. Written out
// rather than select("*") so adding a private column to organizations later
// cannot silently widen the public payload. Exported so a test can assert
// what it does not contain.
export const PUBLIC_COLUMNS =
  "id, name, description, products_services, website, public_contact_email, industry, company_size, location, categories, operating_regions, is_buyer, is_supplier";

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(url && key)) {
    throw new Error("Database is not configured on this deployment.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToPublicOrganization(
  row: Record<string, unknown>
): PublicOrganization {
  return {
    categories: (row.categories as string[] | null) ?? [],
    companySize: (row.company_size as string) || null,
    description: (row.description as string) || null,
    id: row.id as string,
    industry: (row.industry as string) || null,
    isBuyer: Boolean(row.is_buyer),
    isSupplier: Boolean(row.is_supplier),
    location: (row.location as string) || null,
    name: row.name as string,
    operatingRegions: (row.operating_regions as string[] | null) ?? [],
    productsServices: (row.products_services as string) || null,
    publicContactEmail: (row.public_contact_email as string) || null,
    website: (row.website as string) || null,
  };
}

// PostgREST's or() takes a comma-separated filter string, so a raw keyword
// containing a comma, parenthesis or quote would be parsed as filter syntax
// rather than as a search term. Strip those, plus the % and * wildcards, so
// a search can never widen its own match set or inject another filter.
const FILTER_METACHARACTERS = /[,()"'\\%*]/g;

export function sanitizeKeyword(raw: string): string {
  return raw.replace(FILTER_METACHARACTERS, " ").trim().slice(0, 80);
}

export function parseDirectoryFilters(
  params: Record<string, string | string[] | undefined>
): DirectoryFilters {
  const first = (value: string | string[] | undefined): string =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

  const capabilityRaw = first(params.capability);
  const capability: DirectoryCapability =
    capabilityRaw === "buyer" || capabilityRaw === "supplier"
      ? capabilityRaw
      : "all";

  const pageRaw = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return {
    capability,
    category: first(params.category),
    page,
    q: sanitizeKeyword(first(params.q)),
    region: first(params.region),
  };
}

// Every predicate is applied in the database, including the keyword match
// and both facets, and the page is cut with range() - the tender listing's
// earlier bug was fetching a fixed window first and filtering it in JS,
// which silently hid results past the window.
export async function listPublicOrganizations(
  filters: DirectoryFilters
): Promise<DirectoryPage> {
  const supabase = getAdminClient();
  const from = (filters.page - 1) * DIRECTORY_PAGE_SIZE;

  let query = supabase
    .from("organizations")
    .select(PUBLIC_COLUMNS, { count: "exact" })
    .eq("is_public", true);

  if (filters.capability === "buyer") {
    query = query.eq("is_buyer", true);
  } else if (filters.capability === "supplier") {
    query = query.eq("is_supplier", true);
  }
  if (filters.category) {
    query = query.contains("categories", [filters.category]);
  }
  if (filters.region) {
    query = query.contains("operating_regions", [filters.region]);
  }
  if (filters.q) {
    query = query.or(
      `name.ilike.%${filters.q}%,description.ilike.%${filters.q}%,products_services.ilike.%${filters.q}%`
    );
  }

  // name then id: name alone is not unique, and an unstable sort makes rows
  // reappear or vanish across pages.
  const { data, count, error } = await query
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + DIRECTORY_PAGE_SIZE - 1);

  if (error) {
    throw new Error(error.message || "Failed to load the directory.");
  }

  const total = count ?? 0;
  return {
    organizations: (data ?? []).map((row) =>
      rowToPublicOrganization(row as Record<string, unknown>)
    ),
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE)),
    total,
  };
}

// A profile that has not opted in is simply not there, for everyone - the
// is_public predicate is part of the query rather than a check on the
// result, so an unlisted organization cannot be read by guessing its id.
export async function getPublicOrganization(
  organizationId: string
): Promise<PublicOrganization | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select(PUBLIC_COLUMNS)
    .eq("id", organizationId)
    .eq("is_public", true)
    .maybeSingle();

  return data ? rowToPublicOrganization(data as Record<string, unknown>) : null;
}

// Facet values come from the listed organizations themselves rather than a
// hardcoded taxonomy, so the filters always offer exactly what is findable.
export async function getDirectoryFacets(): Promise<{
  categories: string[];
  regions: string[];
}> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("categories, operating_regions")
    .eq("is_public", true);

  const categories = new Set<string>();
  const regions = new Set<string>();
  for (const row of data ?? []) {
    for (const value of (row.categories as string[] | null) ?? []) {
      categories.add(value);
    }
    for (const value of (row.operating_regions as string[] | null) ?? []) {
      regions.add(value);
    }
  }
  return {
    categories: [...categories].sort(),
    regions: [...regions].sort(),
  };
}
