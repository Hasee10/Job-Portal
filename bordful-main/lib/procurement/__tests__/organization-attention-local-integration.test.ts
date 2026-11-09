// Real integration test for getOrganizationAttention - the minimum useful
// in-app notification surface (P1 product-polish pass). Confirms the three
// counts against the real tables instead of mocks, since each is its own
// query/shape. Skipped unless SUPABASE_URL points at loopback. Everything
// created is removed in afterAll, including when an expectation fails.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { OrganizationMemberRef } from "../organization-actions";
import { getOrganizationAttention } from "../organization-actions";
import { submitOrganizationResponse } from "../organization-response-actions";
import {
  createOrganizationRequest,
  inviteSupplierOrganizations,
  publishOrganizationRequest,
} from "../organization-rfq-actions";
import type { ProcurementRequestInput } from "../request-actions";
import { localTarget } from "./local-integration-env";

const { canRun, serviceKey, url } = localTarget();
const describeLocal = canRun ? describe : describe.skip;

const RUN = `zattntest-${Date.now().toString(36)}`;

function member(): OrganizationMemberRef {
  return { memberId: crypto.randomUUID(), memberType: "employer" };
}

describeLocal("local integration: organization attention counts", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const buyerOwner = member();
  const supplierOwner = member();

  let buyerOrg = "";
  let supplierOrg = "";
  let requestId = "";

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

  beforeAll(async () => {
    buyerOrg = await createOrg(`${RUN} Buyer`, buyerOwner);
    supplierOrg = await createOrg(`${RUN} Supplier`, supplierOwner);

    // A pending connection request, buyer -> supplier: counts against the
    // RECIPIENT (supplier), not the requester.
    const { error: connError } = await admin
      .from("organization_connections")
      .insert({
        buyer_org_id: buyerOrg,
        recipient_org_id: supplierOrg,
        requested_by_id: buyerOwner.memberId,
        requested_by_type: "employer",
        requester_org_id: buyerOrg,
        status: "pending",
        supplier_org_id: supplierOrg,
      });
    if (connError) {
      throw new Error(`pending connection: ${connError.message}`);
    }

    // So supplier can be invited (inviteSupplierOrganizations requires an
    // accepted connection), add a SECOND, already-accepted connection
    // between the same pair is not allowed by the unique pair - instead
    // accept this one for the invite step, then flip it back to pending to
    // verify the count once the RFQ side is also set up.
    const input: ProcurementRequestInput = {
      category: "steel",
      description: "50 tonnes of structural steel beams.",
      requiresPrequalification: false,
      responseDeadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      sealedBids: false,
      specFields: [],
      title: `${RUN} Steel beams`,
      type: "rfq",
      visibility: "invite_only",
    };
    await admin
      .from("organization_connections")
      .update({ status: "accepted" })
      .eq("buyer_org_id", buyerOrg)
      .eq("supplier_org_id", supplierOrg);

    const request = await createOrganizationRequest(
      buyerOwner,
      buyerOrg,
      input
    );
    requestId = request.id;
    await inviteSupplierOrganizations(buyerOwner, buyerOrg, requestId, [
      supplierOrg,
    ]);
    await publishOrganizationRequest(buyerOwner, buyerOrg, requestId);

    // Flip back to pending so the connection count is exercised too - the
    // invitation itself does not depend on the connection staying accepted.
    await admin
      .from("organization_connections")
      .update({ status: "pending" })
      .eq("buyer_org_id", buyerOrg)
      .eq("supplier_org_id", supplierOrg);
  });

  afterAll(async () => {
    if (requestId) {
      await admin
        .from("procurement_responses")
        .delete()
        .eq("request_id", requestId);
      await admin
        .from("procurement_invitations")
        .delete()
        .eq("request_id", requestId);
      await admin
        .from("procurement_audit_log")
        .delete()
        .eq("request_id", requestId);
      await admin.from("procurement_requests").delete().eq("id", requestId);
    }
    const orgIds = [buyerOrg, supplierOrg].filter(Boolean);
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
  });

  it("counts a pending incoming connection for the recipient, not the requester", async () => {
    const supplierAttention = await getOrganizationAttention(
      supplierOrg,
      true,
      true
    );
    expect(supplierAttention.pendingConnections).toBe(1);

    const buyerAttention = await getOrganizationAttention(buyerOrg, true, true);
    expect(buyerAttention.pendingConnections).toBe(0);
  });

  it("counts an unanswered RFQ invitation for the supplier", async () => {
    const attention = await getOrganizationAttention(supplierOrg, true, true);
    expect(attention.openInvitations).toBe(1);
  });

  it("counts a quotation on a still-open request for the buyer, until evaluation starts", async () => {
    const before = await getOrganizationAttention(buyerOrg, true, true);
    expect(before.pendingQuotations).toBe(0);

    await submitOrganizationResponse(supplierOwner, supplierOrg, requestId, {
      pricing: { amount: "48500", currency: "USD" },
      proposalDocumentPath: null,
      proposalText: "We can supply the beams within 21 days.",
    });

    const after = await getOrganizationAttention(buyerOrg, true, true);
    expect(after.pendingQuotations).toBe(1);

    // The invitation is answered now, so it drops off the supplier's count.
    const supplierAfter = await getOrganizationAttention(
      supplierOrg,
      true,
      true
    );
    expect(supplierAfter.openInvitations).toBe(0);
  });

  it("returns zero counts for an organization with neither capability flag relevant", async () => {
    const attention = await getOrganizationAttention(buyerOrg, false, false);
    expect(attention.openInvitations).toBe(0);
    expect(attention.pendingQuotations).toBe(0);
  });
});
