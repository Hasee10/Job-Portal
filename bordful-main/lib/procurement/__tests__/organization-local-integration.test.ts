// Real integration test: the actual application actions, through the real
// supabase-js client, over HTTP, against standalone PostgREST and the local
// PostgreSQL server. Nothing here is mocked.
//
// It is SKIPPED unless SUPABASE_URL points at loopback, so the normal suite
// and CI are unaffected - there is no database there to talk to. To run it:
//
//   1. powershell -File supabase/local-dev-credentials.ps1
//   2. powershell -File supabase/local-postgrest-start.ps1   (leave running)
//   3. node supabase/local-rest-gateway.mjs                  (leave running)
//   4. npx vitest run lib/procurement/__tests__/organization-local-integration.test.ts
//
// The sibling tests in this directory cover the authorization predicates with
// mocks; this covers the wire. Every row it creates is removed again in
// afterAll, including when an expectation fails.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localTarget } from "./local-integration-env";

const { anonKey, canRun, serviceKey, url } = localTarget();
const describeLocal = canRun ? describe : describe.skip;

// A unique marker per run, so a crashed earlier run cannot confuse this one
// and cleanup can find exactly its own rows.
const RUN = `ziltest-${Date.now().toString(36)}`;
const uuid = () => crypto.randomUUID();

interface Ref {
  memberId: string;
  memberType: "employer";
}

const NOT_FOUND = /not found/i;
const RANGE_NOT_SATISFIABLE = /range not satisfiable/i;

describeLocal("local HTTP integration: organizations and marketplace", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const createdOrgIds: string[] = [];

  let owner: Ref;
  let outsider: Ref;
  let buyerId = "";
  let supplierId = "";
  let dualId = "";
  let privateId = "";

  beforeAll(() => {
    owner = { memberId: uuid(), memberType: "employer" };
    outsider = { memberId: uuid(), memberType: "employer" };
  });

  afterAll(async () => {
    // Leave the database exactly as it was found.
    if (createdOrgIds.length > 0) {
      await admin
        .from("organization_members")
        .delete()
        .in("organization_id", createdOrgIds);
      await admin.from("organizations").delete().in("id", createdOrgIds);
    }
    const { count } = await admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .ilike("name", `%${RUN}%`);
    // Thrown rather than asserted: an expect() in a hook is not attributed to
    // any test, so a leak here would be reported confusingly or not at all.
    if ((count ?? 0) !== 0) {
      throw new Error(`Cleanup failed: ${count} ${RUN} organizations remain.`);
    }
  });

  async function newOrg(
    label: string,
    isBuyer: boolean,
    isSupplier: boolean
  ): Promise<string> {
    const { createOrganization } = await import(
      "@/lib/procurement/organization-actions"
    );
    const org = await createOrganization(owner, {
      companySize: "11-50",
      description: null,
      industry: "Manufacturing",
      isBuyer,
      isSupplier,
      location: "Karachi",
      name: `${RUN} ${label}`,
      website: null,
    });
    createdOrgIds.push(org.id);
    return org.id;
  }

  it("reaches PostgREST over HTTP at all", async () => {
    const { error } = await admin
      .from("organizations")
      .select("id", { count: "exact", head: true });
    expect(error).toBeNull();
  });

  it("creates organizations through the RPC, with the owner membership", async () => {
    const { listOrganizationMembers } = await import(
      "@/lib/procurement/organization-actions"
    );
    buyerId = await newOrg("buyer", true, false);
    supplierId = await newOrg("supplier", false, true);
    dualId = await newOrg("dual", true, true);
    privateId = await newOrg("private", true, true);

    const members = await listOrganizationMembers(owner, buyerId);
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe("owner");
    expect(members[0].memberId).toBe(owner.memberId);
  });

  it("rejects an organization that is neither buyer nor supplier", async () => {
    const { createOrganization } = await import(
      "@/lib/procurement/organization-actions"
    );
    await expect(
      createOrganization(owner, {
        companySize: null,
        description: null,
        industry: null,
        isBuyer: false,
        isSupplier: false,
        location: null,
        name: `${RUN} invalid`,
        website: null,
      })
    ).rejects.toThrow();
  });

  it("reads an organization back for its member, and not for an outsider", async () => {
    const { getOrganizationForMember } = await import(
      "@/lib/procurement/organization-actions"
    );
    const mine = await getOrganizationForMember(owner, buyerId);
    expect(mine?.id).toBe(buyerId);
    expect(mine?.role).toBe("owner");
    expect(mine?.isBuyer).toBe(true);
    expect(mine?.isSupplier).toBe(false);

    expect(await getOrganizationForMember(outsider, buyerId)).toBeNull();
  });

  it("lists an organization for its member via the embedded join", async () => {
    const { listOrganizationsForMember } = await import(
      "@/lib/procurement/organization-actions"
    );
    const mine = await listOrganizationsForMember(owner);
    const ids = mine.map((o) => o.id);
    expect(ids).toContain(buyerId);
    expect(ids).toContain(dualId);
    expect(mine.every((o) => o.role === "owner")).toBe(true);

    expect(await listOrganizationsForMember(outsider)).toHaveLength(0);
  });

  it("refuses a profile update from a non-member", async () => {
    const { updateOrganizationProfile } = await import(
      "@/lib/procurement/organization-actions"
    );
    await expect(
      updateOrganizationProfile(outsider, buyerId, {
        categories: [],
        companySize: null,
        description: null,
        industry: null,
        isBuyer: true,
        isPublic: true,
        isSupplier: false,
        location: null,
        name: `${RUN} hijacked`,
        operatingRegions: [],
        productsServices: null,
        publicContactEmail: null,
        website: null,
      })
    ).rejects.toThrow(NOT_FOUND);
  });

  it("opts organizations into the directory via a profile update", async () => {
    const { updateOrganizationProfile } = await import(
      "@/lib/procurement/organization-actions"
    );
    const publish = async (
      id: string,
      label: string,
      isBuyer: boolean,
      isSupplier: boolean,
      isPublic: boolean,
      categories: string[],
      regions: string[]
    ) =>
      updateOrganizationProfile(owner, id, {
        categories,
        companySize: "11-50",
        description: `${label} supplying hydraulic valves`,
        industry: "Manufacturing",
        isBuyer,
        isPublic,
        isSupplier,
        location: "Karachi",
        name: `${RUN} ${label}`,
        operatingRegions: regions,
        productsServices: "valves, pumps, fittings",
        publicContactEmail: "procurement@example.test",
        website: "https://example.test",
      });

    const buyer = await publish(
      buyerId,
      "buyer",
      true,
      false,
      true,
      ["industrial-supplies"],
      ["PK"]
    );
    expect(buyer.isPublic).toBe(true);
    expect(buyer.categories).toEqual(["industrial-supplies"]);
    expect(buyer.operatingRegions).toEqual(["PK"]);

    await publish(
      supplierId,
      "supplier",
      false,
      true,
      true,
      ["industrial-supplies"],
      ["BH"]
    );
    await publish(
      dualId,
      "dual",
      true,
      true,
      true,
      ["logistics"],
      ["PK", "BH"]
    );
    // Deliberately left unlisted.
    await publish(
      privateId,
      "private",
      true,
      true,
      false,
      ["industrial-supplies"],
      ["PK"]
    );
  });

  it("returns only opted-in organizations from the directory", async () => {
    const { listPublicOrganizations } = await import(
      "@/lib/procurement/directory-actions"
    );
    const page = await listPublicOrganizations({
      capability: "all",
      category: "",
      page: 1,
      q: RUN,
      region: "",
    });
    const ids = page.organizations.map((o) => o.id);
    expect(ids).toContain(buyerId);
    expect(ids).toContain(supplierId);
    expect(ids).toContain(dualId);
    expect(ids).not.toContain(privateId);
    expect(page.total).toBe(3);
  });

  it("filters by capability, category and region in the database", async () => {
    const { listPublicOrganizations } = await import(
      "@/lib/procurement/directory-actions"
    );
    const find = (
      over: Partial<Parameters<typeof listPublicOrganizations>[0]>
    ) =>
      listPublicOrganizations({
        capability: "all",
        category: "",
        page: 1,
        q: RUN,
        region: "",
        ...over,
      });

    const buyers = await find({ capability: "buyer" });
    expect(buyers.organizations.map((o) => o.id).sort()).toEqual(
      [buyerId, dualId].sort()
    );

    const suppliers = await find({ capability: "supplier" });
    expect(suppliers.organizations.map((o) => o.id).sort()).toEqual(
      [supplierId, dualId].sort()
    );

    const logistics = await find({ category: "logistics" });
    expect(logistics.organizations.map((o) => o.id)).toEqual([dualId]);

    const bahrain = await find({ region: "BH" });
    expect(bahrain.organizations.map((o) => o.id).sort()).toEqual(
      [supplierId, dualId].sort()
    );

    const byKeyword = await find({ q: `${RUN} dual` });
    expect(byKeyword.organizations.map((o) => o.id)).toEqual([dualId]);
  });

  it("hides an unlisted organization from the public profile route", async () => {
    const { getPublicOrganization } = await import(
      "@/lib/procurement/directory-actions"
    );
    expect(await getPublicOrganization(privateId)).toBeNull();

    const shown = await getPublicOrganization(buyerId);
    expect(shown?.id).toBe(buyerId);
    // The public projection must not carry the opt-in flag or internal fields.
    expect(Object.keys(shown ?? {})).not.toContain("isPublic");
  });

  it("builds directory facets from listed organizations only", async () => {
    const { getDirectoryFacets } = await import(
      "@/lib/procurement/directory-actions"
    );
    const facets = await getDirectoryFacets();
    expect(facets.categories).toContain("industrial-supplies");
    expect(facets.categories).toContain("logistics");
    expect(facets.regions).toContain("PK");
    expect(facets.regions).toContain("BH");
  });

  it("pages stably under the directory's ordering", async () => {
    const { listPublicOrganizations } = await import(
      "@/lib/procurement/directory-actions"
    );
    const first = await listPublicOrganizations({
      capability: "all",
      category: "",
      page: 1,
      q: RUN,
      region: "",
    });
    expect(first.total).toBe(3);
    expect(first.pageCount).toBe(1);
    // name then id, applied in the database - an unstable sort makes rows
    // reappear or vanish across pages.
    const names = first.organizations.map((o) => o.name);
    expect([...names].sort()).toEqual(names);
  });

  // DEFECT, found by this test and not yet fixed: a page past the last one
  // throws instead of coming back empty.
  //
  // listPublicOrganizations() asks for range(from, from + 11) and PostgREST
  // answers 416 PGRST103 ("An offset of 24 was requested, but there are only
  // 3 rows") whenever the offset exceeds the row count. parseDirectoryFilters
  // accepts any page > 0 straight from the query string, so /marketplace?page=2
  // on a directory with fewer than 13 listed organizations is enough to
  // trigger it. Hosted Supabase runs the same PostgREST behind Kong, so this
  // is production behaviour too, not a local-stack artifact.
  //
  // A mocked client cannot catch this: it returns {data: [], error: null} for
  // an out-of-range offset, because the Range semantics live in PostgREST.
  //
  // The fix belongs in the M2 branch under review in PR #95, not on this
  // local-development branch, so this test pins the current behaviour rather
  // than asserting the behaviour we want. Change it to expect an empty page
  // when that fix lands.
  it("throws on a page past the last one (unfixed M2 defect)", async () => {
    const { listPublicOrganizations } = await import(
      "@/lib/procurement/directory-actions"
    );
    await expect(
      listPublicOrganizations({
        capability: "all",
        category: "",
        page: 2,
        q: RUN,
        region: "",
      })
    ).rejects.toThrow(RANGE_NOT_SATISFIABLE);
  });

  // The whole authorization model rests on anon having no reach, so prove it
  // over HTTP rather than trusting the grants.
  it("denies the anon key every path to organization data", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const read = await anon.from("organizations").select("id").limit(1);
    expect(read.error).not.toBeNull();
    expect(read.data).toBeNull();

    const members = await anon
      .from("organization_members")
      .select("id")
      .limit(1);
    expect(members.error).not.toBeNull();

    const write = await anon
      .from("organizations")
      .insert({ is_buyer: true, is_supplier: false, name: `${RUN} anon` });
    expect(write.error).not.toBeNull();

    const rpc = await anon.rpc("create_organization_with_owner", {
      p_company_size: null,
      p_description: null,
      p_industry: null,
      p_is_buyer: true,
      p_is_supplier: false,
      p_location: null,
      p_member_id: uuid(),
      p_member_type: "employer",
      p_name: `${RUN} anon rpc`,
      p_website: null,
    });
    expect(rpc.error).not.toBeNull();
  });
});
