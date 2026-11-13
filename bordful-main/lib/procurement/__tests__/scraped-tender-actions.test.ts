import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string;
  source: string;
  country: string;
  cpv_codes: string[];
  cpv_divisions: string[];
  title: string;
  buyer_name: string;
  is_active: boolean;
  publication_date: string;
  deadline_date: string | null;
  url: string;
};
type Result = { data: Row[]; count: number; error: null };
type Query = {
  select(columns: string): Query;
  eq(field: keyof Row, value: unknown): Query;
  in(field: keyof Row, values: unknown[]): Query;
  overlaps(field: keyof Row, values: unknown[]): Query;
  or(expression: string): Query;
  order(field: keyof Row, opts?: { ascending?: boolean }): Query;
  range(start: number, stop: number): Query;
  then(resolve: (value: Result) => unknown): Promise<unknown>;
};

const state = vi.hoisted(() => ({ calls: [] as string[], rows: [] as Row[] }));

// Mirrors scraped_tender_facets() from
// supabase/migrations/20261113_scraped_tenders_facets_performance.sql: same
// three groupings, same shape ({kind, key, cnt}), over state.rows instead
// of a real table - this is what proves the RPC call site is wired
// correctly without standing up Postgres for a unit test. The SQL
// function's own correctness (and its equivalence to the old JS
// aggregation, over 90,500 rows at production scale, not this handful) is
// verified separately - see the PR description.
function mockFacetsRpc(categoryPrefixes: string[]) {
  const active = state.rows.filter((r) => r.is_active);
  const rows: { kind: string; key: string; cnt: number }[] = [];

  const sourceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const row of active) {
    sourceCounts.set(row.source, (sourceCounts.get(row.source) ?? 0) + 1);
    if (row.country) {
      countryCounts.set(row.country, (countryCounts.get(row.country) ?? 0) + 1);
    }
    for (const division of row.cpv_divisions) {
      if (categoryPrefixes.includes(division)) {
        categoryCounts.set(division, (categoryCounts.get(division) ?? 0) + 1);
      }
    }
  }
  for (const [key, cnt] of sourceCounts) {
    rows.push({ cnt, key, kind: "source" });
  }
  for (const [key, cnt] of countryCounts) {
    rows.push({ cnt, key, kind: "country" });
  }
  for (const [key, cnt] of categoryCounts) {
    rows.push({ cnt, key, kind: "category" });
  }
  return rows;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => {
      let rows = [...state.rows];
      let begin = 0;
      let end = Number.POSITIVE_INFINITY;
      const orders: { field: keyof Row; ascending: boolean }[] = [];
      const query: Query = {
        eq(field: keyof Row, value: unknown) {
          rows = rows.filter((row) => row[field] === value);
          return query;
        },
        in(field: keyof Row, values: unknown[]) {
          rows = rows.filter((row) => values.includes(row[field]));
          return query;
        },
        or(expression: string) {
          const literal = expression.slice(
            "title.ilike.".length,
            expression.indexOf(",buyer_name.ilike.")
          );
          const term = JSON.parse(literal)
            .slice(1, -1)
            .replace(/\\(.)/g, "$1")
            .toLowerCase();
          rows = rows.filter(
            (row) =>
              row.title.toLowerCase().includes(term) ||
              row.buyer_name?.toLowerCase().includes(term)
          );
          return query;
        },
        order(field: keyof Row, opts: { ascending?: boolean } = {}) {
          orders.push({ ascending: opts.ascending !== false, field });
          return query;
        },
        overlaps(field: keyof Row, values: unknown[]) {
          rows = rows.filter((row) => {
            const fieldValue = row[field];
            return (
              Array.isArray(fieldValue) &&
              fieldValue.some((v) => values.includes(v))
            );
          });
          return query;
        },
        range(start: number, stop: number) {
          begin = start;
          end = stop;
          return query;
        },
        select(columns: string) {
          state.calls.push(columns);
          return query;
        },
        then(resolve: (value: Result) => unknown) {
          rows.sort((a, b) => {
            for (const { field, ascending } of orders) {
              if (a[field] == null && b[field] == null) {
                continue;
              }
              if (a[field] == null) {
                return 1;
              }
              if (b[field] == null) {
                return -1;
              }
              const result = String(a[field]).localeCompare(String(b[field]));
              if (result) {
                return ascending ? result : -result;
              }
            }
            return 0;
          });
          return Promise.resolve({
            count: rows.length,
            data: rows.slice(begin, end + 1),
            error: null,
          }).then(resolve);
        },
      };
      return query;
    },
    rpc: (name: string, args: { category_prefixes: string[] }) => {
      state.calls.push(`rpc:${name}`);
      if (name !== "scraped_tender_facets") {
        return Promise.resolve({
          data: null,
          error: new Error(`unexpected rpc ${name}`),
        });
      }
      return Promise.resolve({
        data: mockFacetsRpc(args.category_prefixes),
        error: null,
      });
    },
  }),
}));

import { getTenderFacets, listActiveTenders } from "../scraped-tender-actions";

// The 2-digit prefix extraction the real trigger
// (scraped_tenders_set_cpv_divisions) performs on write, replicated here so
// the mock rows look like what the database would actually store.
function divisionsOf(codes: string[]): string[] {
  return codes.filter((c) => c.length >= 2).map((c) => c.slice(0, 2));
}

beforeEach(() => {
  process.env.SUPABASE_URL = "http://localhost:3002";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
  state.calls = [];
  state.rows = Array.from({ length: 3105 }, (_, i) => {
    const cpvCodes = [i === 3104 ? "72000000" : "45000000"];
    return {
      buyer_name: "Buyer",
      country: i === 3104 ? "PAK" : "DEU",
      cpv_codes: cpvCodes,
      cpv_divisions: divisionsOf(cpvCodes),
      deadline_date: i === 0 ? null : "2026-12-01",
      id: String(i).padStart(5, "0"),
      is_active: true,
      publication_date: "2026-11-01",
      source: i === 3104 ? "ppra" : "ted",
      title: i === 3104 ? "Software 100%_*, contract" : "Construction",
      url: `https://example.com/${i}`,
    };
  });
});

describe("tender retrieval correctness", () => {
  it("uses exact full totals and bounded pages with stable ordering", async () => {
    const result = await listActiveTenders({ page: 2, perPage: 20 });
    expect(result.total).toBe(3105);
    expect(result.tenders).toHaveLength(20);
    expect(result.tenders[0].id).toBe("00020");
    expect(state.calls).toHaveLength(1);
  });

  it("retains a small source and literal keyword punctuation", async () => {
    const result = await listActiveTenders({
      countries: ["PAK"],
      query: "100%_*,",
      sources: ["ppra"],
    });
    expect(result.total).toBe(1);
    expect(result.tenders[0].url).toBe("https://example.com/3104");
  });

  // Regression test for the production performance defect: category
  // filtering and facets used to need a full-table fetch
  // (getActiveIndex()) because prefix matching over full CPV codes isn't
  // expressible through PostgREST. Both now go through a single query each
  // - .overlaps() against the trigger-maintained cpv_divisions column for
  // listing, one RPC round trip for facets - so this also asserts exactly
  // one call per operation, not just the right answer.
  it("counts facets and category matches via a single indexed query each, no full-table scan", async () => {
    const facets = await getTenderFacets();
    expect(facets.sources.find((row) => row.source === "ppra")?.count).toBe(1);
    expect(facets.sources.reduce((sum, row) => sum + row.count, 0)).toBe(3105);
    expect(facets.categories.find((c) => c.cpvPrefix === "72")?.count).toBe(1);
    expect(state.calls).toEqual(["rpc:scraped_tender_facets"]);

    state.calls = [];
    const result = await listActiveTenders({
      categories: ["72"],
      query: "Software",
    });
    expect(result.total).toBe(1);
    expect(result.tenders[0].id).toBe("03104");
    expect(state.calls).toHaveLength(1);
  });

  it("sorts deadlines with nulls last and handles empty pages", async () => {
    const result = await listActiveTenders({ page: 1, sort: "deadline" });
    expect(result.tenders[0].id).toBe("00001");
    expect((await listActiveTenders({ page: 999 })).tenders).toEqual([]);
  });
});
