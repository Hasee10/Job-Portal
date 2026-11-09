// Real M4A workflow against the local stack: a buyer organization issues an
// RFQ, invites a supplier it has already approved, and that supplier sees the
// opportunity from its own workspace. Exercised through the actual server
// actions against PostgreSQL via standalone PostgREST. Nothing is mocked.
//
// Also pins the compatibility promise: a legacy employer-owned request, with
// buyer_id and no organization, is still readable through its original path
// after the XOR constraint was added.
//
// Skipped unless SUPABASE_URL points at loopback, which is what makes it
// impossible to run against the hosted project. Everything is removed in
// afterAll, including when an expectation fails.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { OrganizationMemberRef } from "../organization-actions";
import {
  createOrganizationRequest,
  inviteSupplierOrganizations,
  listRequestSupplierInvitations,
  listSupplierOpportunities,
  publishOrganizationRequest,
} from "../organization-rfq-actions";
import {
  getRequestForBuyer,
  type ProcurementRequestInput,
} from "../request-actions";
import { localTarget } from "./local-integration-env";

const { canRun, serviceKey, url } = localTarget();
const describeLocal = canRun ? describe : describe.skip;

const RUN = `zrfqtest-${Date.now().toString(36)}`;
const NOT_FOUND = /not found/i;
const OWNER_ONLY = /owner or admin/i;
const NOT_BUYER = /not set up as a buyer/i;

function member(): OrganizationMemberRef {
  return { memberId: crypto.randomUUID(), memberType: "employer" };
}

function rfqInput(title: string): ProcurementRequestInput {
  return {
    category: "office furniture",
    description: "20 height-adjustable office desks, delivered and assembled.",
    requiresPrequalification: false,
    responseDeadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    sealedBids: false,
    specFields: [{ fieldType: "text", label: "Quantity", value: "20" }],
    title,
    type: "rfq",
    visibility: "invite_only",
  };
}

describeLocal("local integration: organization-owned RFQs", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const buyerOwner = member();
  const supplierOwner = member();
  const outsiderOwner = member();
  const plainMember = member();

  let buyerOrg = "";
  let supplierOrg = "";
  let outsiderOrg = "";
  let unapprovedOrg = "";
  let legacyEmployerId = "";
  let legacyRequestId = "";
  let requestId = "";

  async function createOrg(
    name: string,
    owner: OrganizationMemberRef,
    isBuyer = true
  ) {
    const { data, error } = await admin.rpc("create_organization_with_owner", {
      p_is_buyer: isBuyer,
      p_is_supplier: true,
      p_member_id: owner.memberId,
      p_member_type: owner.memberType,
      p_name: name,
    });
    if (error) {
      throw new Error(`createOrg ${name}: ${error.message}`);
    }
    const row = (Array.isArray(data) ? data[0] : data) as { id: string };
    return row.id;
  }

  beforeAll(async () => {
    buyerOrg = await createOrg(`${RUN} Buyer`, buyerOwner);
    supplierOrg = await createOrg(`${RUN} Supplier`, supplierOwner);
    outsiderOrg = await createOrg(`${RUN} Outsider`, outsiderOwner);
    unapprovedOrg = await createOrg(`${RUN} Unapproved`, member());

    // An ordinary member of the buyer: in the organization, but without the
    // owner/admin authority an RFQ requires.
    await admin.from("organization_members").insert({
      member_id: plainMember.memberId,
      member_type: plainMember.memberType,
      organization_id: buyerOrg,
      role: "member",
    });

    // The buyer has approved exactly one supplier.
    await admin.from("organization_connections").insert({
      buyer_org_id: buyerOrg,
      recipient_org_id: supplierOrg,
      requested_by_id: buyerOwner.memberId,
      requested_by_type: "employer",
      requester_org_id: buyerOrg,
      status: "accepted",
      supplier_org_id: supplierOrg,
    });

    // A legacy, employer-owned request that predates organizations.
    const { data: emp, error: empError } = await admin
      .from("employers")
      .insert({
        company_name: `${RUN} Legacy Co`,
        email: `${RUN}@example.test`,
      })
      .select("id")
      .single();
    if (empError) {
      throw new Error(`legacy employer: ${empError.message}`);
    }
    legacyEmployerId = emp.id as string;

    const { data: legacy, error: legacyError } = await admin
      .from("procurement_requests")
      .insert({
        buyer_id: legacyEmployerId,
        category: "legacy",
        description: "Predates organizations.",
        title: `${RUN} Legacy Request`,
        type: "rfq",
      })
      .select("id")
      .single();
    if (legacyError) {
      throw new Error(`legacy request: ${legacyError.message}`);
    }
    legacyRequestId = legacy.id as string;
  });

  afterAll(async () => {
    const orgIds = [buyerOrg, supplierOrg, outsiderOrg, unapprovedOrg].filter(
      Boolean
    );
    const requestIds = [requestId, legacyRequestId].filter(Boolean);
    if (requestIds.length) {
      await admin
        .from("procurement_invitations")
        .delete()
        .in("request_id", requestIds);
      await admin
        .from("procurement_audit_log")
        .delete()
        .in("request_id", requestIds);
      await admin.from("procurement_requests").delete().in("id", requestIds);
    }
    if (orgIds.length) {
      await admin
        .from("organization_connections")
        .delete()
        .in("buyer_org_id", orgIds);
      await admin
        .from("organization_members")
        .delete()
        .in("organization_id", orgIds);
      await admin.from("organizations").delete().in("id", orgIds);
    }
    if (legacyEmployerId) {
      await admin.from("employers").delete().eq("id", legacyEmployerId);
    }
    const { count } = await admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .like("name", `${RUN}%`);
    if ((count ?? 0) !== 0) {
      throw new Error(`cleanup left ${count} organizations behind`);
    }
  });

  it("lets an authorized buyer member create an organization-owned RFQ", async () => {
    const request = await createOrganizationRequest(
      buyerOwner,
      buyerOrg,
      rfqInput(`${RUN} Office desks`)
    );
    requestId = request.id;
    expect(request.title).toBe(`${RUN} Office desks`);

    // Attribution: owned by the organization, with no legacy employer.
    const { data } = await admin
      .from("procurement_requests")
      .select("buyer_id, buyer_org_id")
      .eq("id", requestId)
      .single();
    expect(data?.buyer_org_id).toBe(buyerOrg);
    expect(data?.buyer_id).toBeNull();
  });

  it("refuses a member without owner or admin authority", async () => {
    await expect(
      createOrganizationRequest(plainMember, buyerOrg, rfqInput(`${RUN} Nope`))
    ).rejects.toThrow(OWNER_ONLY);
  });

  it("refuses an organization that is not buyer-capable", async () => {
    const supplierOnly = await createOrg(
      `${RUN} SupplierOnly`,
      supplierOwner,
      false
    );
    await expect(
      createOrganizationRequest(
        supplierOwner,
        supplierOnly,
        rfqInput(`${RUN} No`)
      )
    ).rejects.toThrow(NOT_BUYER);
    await admin
      .from("organization_members")
      .delete()
      .eq("organization_id", supplierOnly);
    await admin.from("organizations").delete().eq("id", supplierOnly);
  });

  it("invites an approved supplier and skips an unapproved one", async () => {
    const result = await inviteSupplierOrganizations(
      buyerOwner,
      buyerOrg,
      requestId,
      [supplierOrg, unapprovedOrg]
    );
    // Approval is buyer-specific: being a real organization is not enough.
    expect(result.invited).toEqual([supplierOrg]);
    expect(result.skipped).toEqual([unapprovedOrg]);

    const invitations = await listRequestSupplierInvitations(
      buyerOwner,
      buyerOrg,
      requestId
    );
    expect(invitations).toHaveLength(1);
    expect(invitations[0].supplierOrgId).toBe(supplierOrg);
    expect(invitations[0].supplierOrgName).toContain("Supplier");
  });

  it("prevents duplicate invitations", async () => {
    const again = await inviteSupplierOrganizations(
      buyerOwner,
      buyerOrg,
      requestId,
      [supplierOrg]
    );
    expect(again.invited).toEqual([]);

    const invitations = await listRequestSupplierInvitations(
      buyerOwner,
      buyerOrg,
      requestId
    );
    expect(invitations).toHaveLength(1);

    // And the database refuses it even when the action is bypassed.
    const direct = await admin.from("procurement_invitations").insert({
      request_id: requestId,
      status: "invited",
      supplier_org_id: supplierOrg,
    });
    expect(direct.error).not.toBeNull();
  });

  it("hides a draft from the invited supplier until it is published", async () => {
    // The invitation already exists at this point, but the request is still
    // a draft - an unopened RFQ must not appear as an opportunity.
    const beforePublish = await listSupplierOpportunities(
      supplierOwner,
      supplierOrg
    );
    expect(
      beforePublish.find((o) => o.request.id === requestId)
    ).toBeUndefined();
  });

  it("shows the opportunity in the invited supplier's workspace once published", async () => {
    const published = await publishOrganizationRequest(
      buyerOwner,
      buyerOrg,
      requestId
    );
    expect(published.status).toBe("published");

    const opportunities = await listSupplierOpportunities(
      supplierOwner,
      supplierOrg
    );
    const mine = opportunities.find((o) => o.request.id === requestId);
    expect(mine).toBeDefined();
    expect(mine?.invitationStatus).toBe("invited");
    expect(mine?.request.title).toBe(`${RUN} Office desks`);
  });

  it("hides it from an organization that was not invited", async () => {
    const opportunities = await listSupplierOpportunities(
      outsiderOwner,
      outsiderOrg
    );
    expect(
      opportunities.find((o) => o.request.id === requestId)
    ).toBeUndefined();

    // Nor can the outsider read it as if it were their own request, or act
    // for an organization they do not belong to.
    await expect(
      listRequestSupplierInvitations(outsiderOwner, outsiderOrg, requestId)
    ).rejects.toThrow(NOT_FOUND);
    await expect(
      listRequestSupplierInvitations(outsiderOwner, buyerOrg, requestId)
    ).rejects.toThrow(NOT_FOUND);
  });

  it("refuses a forged invite against another organization's request", async () => {
    // The outsider owns a real buyer organization and names a real request
    // id - but not one of theirs.
    await expect(
      inviteSupplierOrganizations(outsiderOwner, outsiderOrg, requestId, [
        supplierOrg,
      ])
    ).rejects.toThrow(NOT_FOUND);
  });

  it("keeps a legacy employer-owned request readable through its own path", async () => {
    const legacy = await getRequestForBuyer(legacyEmployerId, legacyRequestId);
    expect(legacy).not.toBeNull();
    expect(legacy?.title).toBe(`${RUN} Legacy Request`);

    // It is still identified by the employer, with no organization attached,
    // and the new XOR constraint accepts exactly that shape.
    const { data } = await admin
      .from("procurement_requests")
      .select("buyer_id, buyer_org_id")
      .eq("id", legacyRequestId)
      .single();
    expect(data?.buyer_id).toBe(legacyEmployerId);
    expect(data?.buyer_org_id).toBeNull();
  });

  it("still refuses a request that claims both identities or neither", async () => {
    const both = await admin.from("procurement_requests").insert({
      buyer_id: legacyEmployerId,
      buyer_org_id: buyerOrg,
      category: "x",
      description: "x",
      title: `${RUN} Both`,
      type: "rfq",
    });
    expect(both.error).not.toBeNull();

    const neither = await admin.from("procurement_requests").insert({
      category: "x",
      description: "x",
      title: `${RUN} Neither`,
      type: "rfq",
    });
    expect(neither.error).not.toBeNull();
  });
});
