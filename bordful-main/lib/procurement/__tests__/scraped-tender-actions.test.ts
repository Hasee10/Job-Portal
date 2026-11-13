import { beforeEach, describe, expect, it, vi } from "vitest";
type Row = {
  id: string;
  source: string;
  country: string;
  cpv_codes: string[];
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
  or(expression: string): Query;
  order(field: keyof Row, opts?: { ascending?: boolean }): Query;
  range(start: number, stop: number): Query;
  then(resolve: (value: Result) => unknown): Promise<unknown>;
};
const state = vi.hoisted(() => ({ rows: [] as Row[], calls: [] as string[] }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => {
      let rows = [...state.rows];
      let begin = 0;
      let end = Infinity;
      const orders: { field: keyof Row; ascending: boolean }[] = [];
      const query: Query = {
        select(columns: string) {
          state.calls.push(columns);
          return query;
        },
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
          orders.push({ field, ascending: opts.ascending !== false });
          return query;
        },
        range(start: number, stop: number) {
          begin = start;
          end = stop;
          return query;
        },
        then(resolve: (value: Result) => unknown) {
          rows.sort((a, b) => {
            for (const { field, ascending } of orders) {
              if (a[field] == null && b[field] == null) continue;
              if (a[field] == null) return 1;
              if (b[field] == null) return -1;
              const result = String(a[field]).localeCompare(String(b[field]));
              if (result) return ascending ? result : -result;
            }
            return 0;
          });
          return Promise.resolve({
            data: rows.slice(begin, end + 1),
            count: rows.length,
            error: null,
          }).then(resolve);
        },
      };
      return query;
    },
  }),
}));
import { getTenderFacets, listActiveTenders } from "../scraped-tender-actions";
beforeEach(() => {
  process.env.SUPABASE_URL = "http://localhost:3002";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
  state.calls = [];
  state.rows = Array.from({ length: 3105 }, (_, i) => ({
    id: String(i).padStart(5, "0"),
    source: i === 3104 ? "ppra" : "ted",
    country: i === 3104 ? "PAK" : "DEU",
    cpv_codes: [i === 3104 ? "72000000" : "45000000"],
    title: i === 3104 ? "Software 100%_*, contract" : "Construction",
    buyer_name: "Buyer",
    is_active: true,
    publication_date: "2026-11-01",
    deadline_date: i === 0 ? null : "2026-12-01",
    url: `https://example.com/${i}`,
  }));
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
      sources: ["ppra"],
      countries: ["PAK"],
      query: "100%_*,",
    });
    expect(result.total).toBe(1);
    expect(result.tenders[0].url).toBe("https://example.com/3104");
  });
  it("counts facets and category matches beyond the old 3000-row cutoff", async () => {
    const facets = await getTenderFacets();
    expect(facets.sources.find((row) => row.source === "ppra")?.count).toBe(1);
    expect(facets.sources.reduce((sum, row) => sum + row.count, 0)).toBe(3105);
    const result = await listActiveTenders({
      categories: ["72"],
      query: "Software",
    });
    expect(result.total).toBe(1);
    expect(result.tenders[0].id).toBe("03104");
  });
  it("sorts deadlines with nulls last and handles empty pages", async () => {
    const result = await listActiveTenders({ sort: "deadline", page: 1 });
    expect(result.tenders[0].id).toBe("00001");
    expect((await listActiveTenders({ page: 999 })).tenders).toEqual([]);
  });
});
