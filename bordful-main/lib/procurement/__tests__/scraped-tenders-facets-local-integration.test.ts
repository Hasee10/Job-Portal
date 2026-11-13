// Real-database regression test for the facet double-counting defect found
// in review of PR #103: a tender whose CPV codes share a 2-digit division
// (e.g. 72000000 and 72200000, both division 72) must count once for that
// category, not once per matching code. A mocked PostgREST client cannot
// catch this - the bug is in what the real trigger and the real SQL
// function compute together, not in how the application calls them - so
// this runs against real local PostgreSQL and the real
// scraped_tender_facets() function from
// supabase/migrations/20261113_scraped_tenders_facets_performance.sql.
//
// Skipped unless SUPABASE_URL points at loopback, which is also the
// interlock that keeps it away from the hosted project. Every row it
// creates is removed in afterAll, and the hook fails loudly if any
// survive.

import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { localTarget } from "./local-integration-env";

const { canRun, serviceKey, url } = localTarget();
const describeLocal = canRun ? describe : describe.skip;

const RUN = `ziltest-facets-${Date.now().toString(36)}`;

describeLocal("local DB: scraped_tenders facet counting (PR #103 fix)", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const sourceIds: string[] = [];

  async function insertTender(
    label: string,
    cpvCodes: string[]
  ): Promise<{ cpvDivisions: string[]; id: string }> {
    const sourceId = `${RUN}-${label}`;
    sourceIds.push(sourceId);
    const { data, error } = await admin
      .from("scraped_tenders")
      .insert({
        buyer_name: "Facet test buyer",
        country: "DEU",
        cpv_codes: cpvCodes,
        deadline_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        is_active: true,
        publication_date: new Date().toISOString().slice(0, 10),
        source: "ted",
        source_id: sourceId,
        title: `${RUN} ${label}`,
        url: `https://example.test/${sourceId}`,
      })
      .select("id, cpv_divisions")
      .single();
    if (error) {
      throw error;
    }
    return {
      cpvDivisions: data.cpv_divisions as string[],
      id: data.id as string,
    };
  }

  async function categoryCount(prefix: string): Promise<number> {
    const { data, error } = await admin.rpc("scraped_tender_facets", {
      category_prefixes: ["72", "79", "45", "71", "80", "85"],
    });
    if (error) {
      throw error;
    }
    const row = (data as { kind: string; key: string; cnt: number }[]).find(
      (r) => r.kind === "category" && r.key === prefix
    );
    return row ? Number(row.cnt) : 0;
  }

  afterAll(async () => {
    await admin.from("scraped_tenders").delete().in("source_id", sourceIds);
    const { count } = await admin
      .from("scraped_tenders")
      .select("id", { count: "exact", head: true })
      .ilike("title", `%${RUN}%`);
    if ((count ?? 0) !== 0) {
      throw new Error(`Cleanup failed: ${count} ${RUN} tenders remain.`);
    }
  });

  it("stores distinct divisions when multiple codes share one division", async () => {
    const before = await categoryCount("72");

    // Three codes, all division 72. The regression: the un-fixed trigger
    // produced {72,72,72} here, and the facets function - which counts one
    // row per element of cpv_divisions per tender - counted this one
    // tender three times.
    const { cpvDivisions } = await insertTender("same-division", [
      "72000000",
      "72200000",
      "72999999",
    ]);
    expect(cpvDivisions).toEqual(["72"]);

    const after = await categoryCount("72");
    expect(after - before).toBe(1);
  });

  it("counts a tender once per distinct division when it spans several", async () => {
    const before72 = await categoryCount("72");
    const before79 = await categoryCount("79");

    const { cpvDivisions } = await insertTender("multi-division", [
      "72000000",
      "72500000",
      "79000000",
    ]);
    // Deterministic ordering (ORDER BY 1 in the trigger), not just the
    // right set of values.
    expect(cpvDivisions).toEqual(["72", "79"]);

    expect((await categoryCount("72")) - before72).toBe(1);
    expect((await categoryCount("79")) - before79).toBe(1);
  });

  it("handles an empty cpv_codes array without error", async () => {
    const { cpvDivisions } = await insertTender("empty-codes", []);
    expect(cpvDivisions).toEqual([]);

    // An empty-codes tender must not appear in any category count or crash
    // the aggregation - the lateral unnest over an empty array contributes
    // zero rows for it, which is the correct outcome, not a special case.
    const facets = await admin.rpc("scraped_tender_facets", {
      category_prefixes: ["72", "79", "45", "71", "80", "85"],
    });
    expect(facets.error).toBeNull();
  });

  it("matches the per-tender-once semantics the old JS implementation had", async () => {
    // The old code counted a tender for a category if ANY of its codes
    // matched (`.some()`) - a single boolean per tender per category,
    // regardless of how many codes matched. This is the SQL-side proof
    // that scraped_tender_facets() reproduces that exactly: inserting one
    // tender with five codes across two divisions must move each of those
    // two category counts by exactly one, never more.
    const prefixes = ["45", "71"];
    const before = await Promise.all(prefixes.map((p) => categoryCount(p)));

    await insertTender("five-codes-two-divisions", [
      "45000000",
      "45100000",
      "45200000",
      "71000000",
      "71300000",
    ]);

    const after = await Promise.all(prefixes.map((p) => categoryCount(p)));
    for (const [index] of prefixes.entries()) {
      expect(after[index] - before[index]).toBe(1);
    }
  });
});
