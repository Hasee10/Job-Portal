// Real M4B1 workflow against the local stack: a buyer organization creates
// and publishes an RFQ, invites an approved supplier organization, and that
// supplier submits a quotation the buyer can then see. Exercised through the
// actual server actions against PostgreSQL via standalone PostgREST. Nothing
// is mocked.
//
// Also pins the compatibility promise: a legacy vendor_account response
// (vendor_id set, no organization) is untouched by the new XOR constraint.
//
// Skipped unless SUPABASE_URL points at loopback, which is what makes it
// impossible to run against the hosted project. Everything created is
// removed in afterAll, including when an expectation fails.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { OrganizationMemberRef } from "../organization-actions";
import {
  getMyOrganizationResponse,
  listOrganizationResponsesForRequest,
  submitOrganizationResponse,
  withdrawOrganizationResponse,
} from "../organization-response-actions";
import {
  createOrganizationRequest,
  inviteSupplierOrganizations,
  publishOrganizationRequest,
} from "../organization-rfq-actions";
import type { ProcurementRequestInput } from "../request-actions";
import { localTarget } from "./local-integration-env";

const { canRun, serviceKey, url } = localTarget();
const describeLocal = canRun ? describe : describe.skip;

const RUN = `zquotetest-${Date.now().toString(36)}`;
const NOT_INVITED = /not been invited|cannot submit/i;
const NOT_ACCEPTING = /not currently accepting/i;
const DEADLINE_PASSED = /deadline.*passed/i;
const OWNER_ONLY = /owner or admin/i;
const CANNOT_SUBMIT = /cannot submit/i;
const NOT_FOUND = /not found/i;

function member(): OrganizationMemberRef {
  return { memberId: crypto.randomUUID(), memberType: "employer" };
}

function rfqInput(title: string, deadline: Date): ProcurementRequestInput {
  return {
    category: "office furniture",
    description: "20 height-adjustable office desks.",
    requiresPrequalification: false,
    responseDeadline: deadline.toISOString(),
    sealedBids: false,
    specFields: [],
    title,
    type: "rfq",
    visibility: "invite_only",
  };
}

describeLocal("local integration: organization quotations", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const buyerOwner = member();
  const supplierOwner = member();
  const outsiderOwner = member();
  const plainSupplierMember = member();

  let buyerOrg = "";
  let supplierOrg = "";
  let outsiderOrg = "";
  let publishedRequestId = "";
  let legacyVendorId = "";
  let legacyRequestId = "";
  let legacyResponseId = "";

  async function createOrg(name: string, owner: OrganizationMemberRef) {
    const { data, error } = await admin.rpc("create_organization_with_owner", {
      p_is_buyer: true,
      p_is_supplier: true,
      p_member_id: owner.memberId,
      p_member_type: owner.memberType,
      p_name: name,
    });
    if (error) {
      throw new Error(`createOrg ${name}: ${error.message}`);
    }
    return (Array.isArray(data) ? data[0] : data).id as string;
  }

  async function approve(buyer: string, supplier: string, requester: string) {
    const { error } = await admin.from("organization_connections").insert({
      buyer_org_id: buyer,
      recipient_org_id: supplier,
      requested_by_id: requester,
      requested_by_type: "employer",
      requester_org_id: buyer,
      status: "accepted",
      supplier_org_id: supplier,
    });
    if (error) {
      throw new Error(`approve: ${error.message}`);
    }
  }

  beforeAll(async () => {
    buyerOrg = await createOrg(`${RUN} Buyer`, buyerOwner);
    supplierOrg = await createOrg(`${RUN} Supplier`, supplierOwner);
    outsiderOrg = await createOrg(`${RUN} Outsider`, outsiderOwner);
    await approve(buyerOrg, supplierOrg, buyerOwner.memberId);

    // A plain (non-owner) member of the supplier organization.
    await admin.from("organization_members").insert({
      member_id: plainSupplierMember.memberId,
      member_type: plainSupplierMember.memberType,
      organization_id: supplierOrg,
      role: "member",
    });

    const future = new Date(Date.now() + 14 * 86_400_000);
    const request = await createOrganizationRequest(
      buyerOwner,
      buyerOrg,
      rfqInput(`${RUN} Office desks`, future)
    );
    await inviteSupplierOrganizations(buyerOwner, buyerOrg, request.id, [
      supplierOrg,
    ]);
    await publishOrganizationRequest(buyerOwner, buyerOrg, request.id);
    publishedRequestId = request.id;

    // A legacy vendor_account and a legacy response, to prove the XOR
    // constraint and the unmodified vendor_id path still work.
    const { data: vendor, error: vendorError } = await admin
      .from("vendor_accounts")
      .insert({
        company_name: `${RUN} Legacy Vendor`,
        email: `${RUN}@example.test`,
      })
      .select("id")
      .single();
    if (vendorError) {
      throw new Error(`legacy vendor: ${vendorError.message}`);
    }
    legacyVendorId = vendor.id as string;

    const { data: legacyReq, error: legacyReqError } = await admin
      .from("procurement_requests")
      .insert({
        buyer_id: null,
        buyer_org_id: buyerOrg,
        category: "legacy",
        description: "A second request for the legacy-response check.",
        response_deadline: future.toISOString(),
        status: "published",
        title: `${RUN} Legacy Response Check`,
        type: "rfq",
        visibility: "open",
      })
      .select("id")
      .single();
    if (legacyReqError) {
      throw new Error(`legacy request: ${legacyReqError.message}`);
    }
    legacyRequestId = legacyReq.id as string;

    const { data: legacyResp, error: legacyRespError } = await admin
      .from("procurement_responses")
      .insert({
        proposal_text: "Legacy vendor submission.",
        request_id: legacyRequestId,
        vendor_id: legacyVendorId,
      })
      .select("id")
      .single();
    if (legacyRespError) {
      throw new Error(`legacy response: ${legacyRespError.message}`);
    }
    legacyResponseId = legacyResp.id as string;
  });

  afterAll(async () => {
    const requestIds = [publishedRequestId, legacyRequestId].filter(Boolean);
    if (requestIds.length) {
      await admin
        .from("procurement_responses")
        .delete()
        .in("request_id", requestIds);
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
    const orgIds = [buyerOrg, supplierOrg, outsiderOrg].filter(Boolean);
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
    if (legacyVendorId) {
      await admin.from("vendor_accounts").delete().eq("id", legacyVendorId);
    }
    const { count } = await admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .like("name", `${RUN}%`);
    if ((count ?? 0) !== 0) {
      throw new Error(`cleanup left ${count} organizations behind`);
    }
  });

  it("lets the approved supplier organization submit a quotation", async () => {
    const response = await submitOrganizationResponse(
      supplierOwner,
      supplierOrg,
      publishedRequestId,
      {
        pricing: { amount: "4500", currency: "USD" },
        proposalDocumentPath: null,
        proposalText: "20 desks, 2 week lead time.",
      }
    );
    expect(response.supplierOrgId).toBe(supplierOrg);
    expect(response.vendorId).toBeNull();

    const mine = await getMyOrganizationResponse(
      supplierOwner,
      supplierOrg,
      publishedRequestId
    );
    expect(mine?.id).toBe(response.id);
  });

  it("refuses an uninvited organization", async () => {
    await expect(
      submitOrganizationResponse(
        outsiderOwner,
        outsiderOrg,
        publishedRequestId,
        {
          pricing: null,
          proposalDocumentPath: null,
          proposalText: "let me in",
        }
      )
    ).rejects.toThrow(NOT_INVITED);
  });

  it("refuses a plain member without owner/admin authority", async () => {
    await expect(
      submitOrganizationResponse(
        plainSupplierMember,
        supplierOrg,
        publishedRequestId,
        { pricing: null, proposalDocumentPath: null, proposalText: "nope" }
      )
    ).rejects.toThrow(OWNER_ONLY);
  });

  it("prevents a duplicate submission", async () => {
    // submitResponse() already flipped the invitation to "responded", so the
    // eligibility gate refuses a second attempt before it ever reaches the
    // insert - a stronger guarantee than relying on the unique constraint
    // alone. The database is still exercised directly below, independent of
    // the action, to confirm the constraint itself holds.
    await expect(
      submitOrganizationResponse(
        supplierOwner,
        supplierOrg,
        publishedRequestId,
        { pricing: null, proposalDocumentPath: null, proposalText: "again" }
      )
    ).rejects.toThrow(CANNOT_SUBMIT);

    const direct = await admin.from("procurement_responses").insert({
      proposal_text: "bypass",
      request_id: publishedRequestId,
      supplier_org_id: supplierOrg,
    });
    expect(direct.error).not.toBeNull();
  });

  it("rejects submission once the deadline has passed", async () => {
    const future = new Date(Date.now() + 86_400_000);
    const lateRequest = await createOrganizationRequest(
      buyerOwner,
      buyerOrg,
      rfqInput(`${RUN} Late`, future)
    );
    await inviteSupplierOrganizations(buyerOwner, buyerOrg, lateRequest.id, [
      supplierOrg,
    ]);
    await publishOrganizationRequest(buyerOwner, buyerOrg, lateRequest.id);
    // Back-date the deadline directly, since the action validates a future
    // date at creation.
    await admin
      .from("procurement_requests")
      .update({ response_deadline: new Date(Date.now() - 1000).toISOString() })
      .eq("id", lateRequest.id);

    await expect(
      submitOrganizationResponse(supplierOwner, supplierOrg, lateRequest.id, {
        pricing: null,
        proposalDocumentPath: null,
        proposalText: "too late",
      })
    ).rejects.toThrow(DEADLINE_PASSED);

    await admin
      .from("procurement_invitations")
      .delete()
      .eq("request_id", lateRequest.id);
    await admin
      .from("procurement_audit_log")
      .delete()
      .eq("request_id", lateRequest.id);
    await admin.from("procurement_requests").delete().eq("id", lateRequest.id);
  });

  it("rejects submission once the request has closed", async () => {
    const future = new Date(Date.now() + 86_400_000);
    const closedRequest = await createOrganizationRequest(
      buyerOwner,
      buyerOrg,
      rfqInput(`${RUN} Closed`, future)
    );
    await inviteSupplierOrganizations(buyerOwner, buyerOrg, closedRequest.id, [
      supplierOrg,
    ]);
    await publishOrganizationRequest(buyerOwner, buyerOrg, closedRequest.id);
    await admin
      .from("procurement_requests")
      .update({ status: "closed_for_responses" })
      .eq("id", closedRequest.id);

    await expect(
      submitOrganizationResponse(supplierOwner, supplierOrg, closedRequest.id, {
        pricing: null,
        proposalDocumentPath: null,
        proposalText: "too late",
      })
    ).rejects.toThrow(NOT_ACCEPTING);

    await admin
      .from("procurement_invitations")
      .delete()
      .eq("request_id", closedRequest.id);
    await admin
      .from("procurement_audit_log")
      .delete()
      .eq("request_id", closedRequest.id);
    await admin
      .from("procurement_requests")
      .delete()
      .eq("id", closedRequest.id);
  });

  it("shows the buyer the response, correctly attributed", async () => {
    const view = await listOrganizationResponsesForRequest(
      buyerOwner,
      buyerOrg,
      publishedRequestId
    );
    expect(view.sealed).toBe(false);
    if (view.sealed) {
      return;
    }
    const mine = view.responses.find((r) => r.supplierOrgId === supplierOrg);
    expect(mine).toBeDefined();
    expect(mine?.supplierOrgName).toContain("Supplier");
    expect(mine?.proposalText).toBe("20 desks, 2 week lead time.");
  });

  it("refuses a third organization reading the buyer's response list", async () => {
    await expect(
      listOrganizationResponsesForRequest(
        outsiderOwner,
        outsiderOrg,
        publishedRequestId
      )
    ).rejects.toThrow(NOT_FOUND);
  });

  it("withdraws and allows the buyer to see the withdrawal", async () => {
    await withdrawOrganizationResponse(
      supplierOwner,
      supplierOrg,
      publishedRequestId
    );
    const mine = await getMyOrganizationResponse(
      supplierOwner,
      supplierOrg,
      publishedRequestId
    );
    expect(mine?.isWithdrawn).toBe(true);

    const view = await listOrganizationResponsesForRequest(
      buyerOwner,
      buyerOrg,
      publishedRequestId
    );
    if (!view.sealed) {
      const mineBuyerSide = view.responses.find(
        (r) => r.supplierOrgId === supplierOrg
      );
      expect(mineBuyerSide?.isWithdrawn).toBe(true);
    }
  });

  it("keeps a legacy vendor_account response compatible and unaffected", async () => {
    const { data } = await admin
      .from("procurement_responses")
      .select("id, vendor_id, supplier_org_id")
      .eq("id", legacyResponseId)
      .single();
    expect(data?.vendor_id).toBe(legacyVendorId);
    expect(data?.supplier_org_id).toBeNull();
  });

  it("still refuses a response claiming both identities or neither", async () => {
    const both = await admin.from("procurement_responses").insert({
      proposal_text: "x",
      request_id: legacyRequestId,
      supplier_org_id: supplierOrg,
      vendor_id: legacyVendorId,
    });
    expect(both.error).not.toBeNull();

    const neither = await admin.from("procurement_responses").insert({
      proposal_text: "x",
      request_id: legacyRequestId,
    });
    expect(neither.error).not.toBeNull();
  });
});
