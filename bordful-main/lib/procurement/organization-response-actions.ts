import "server-only";
import { createClient } from "@supabase/supabase-js";
import { logAudit } from "./audit-actions";
import {
  canManageOrganization,
  getMemberRole,
  type OrganizationMemberRef,
} from "./organization-actions";
import { getOrganizationRequest } from "./organization-rfq-actions";
import { getRequestById, type ProcurementRequest } from "./request-actions";
import {
  canVendorSubmitResponse,
  isSealedFromBuyer,
  isSubmissionWindowOpen,
  type ProcurementResponse,
  type SubmitResponseInput,
} from "./response-actions";

// M4B1: a supplier organization submitting a quotation against an
// organization-owned (or legacy) RFQ. This is the existing RFx response
// engine with an organization identity attached, not a parallel one - same
// procurement_responses table, same submission window, same sealed-bid
// predicate, same audit log. The vendor-facing path in response-actions.ts
// is untouched; legacy vendor_accounts keep submitting through it exactly as
// before.
//
// Authorization is entirely in this layer, for the same reason as
// organization-rfq-actions.ts: the server client holds service_role and
// bypasses RLS. Every function re-derives from the database: active
// membership, the organization's supplier capability, and - critically -
// that THIS organization holds an invitation to THIS request. A directory
// listing or an accepted business connection grants nothing here; only the
// invitation does.

export interface OrganizationResponse extends ProcurementResponse {
  supplierOrgId: string;
}

export interface ResponseWithSupplierOrg extends OrganizationResponse {
  supplierOrgName: string | null;
}

// Mirrors response-actions.ts's ResponsesView: a sealed request yields a
// count only, never the response rows, so there is no accidental content
// leak via an unused query result on the sealed branch.
export type OrganizationResponsesView =
  | { sealed: true; count: number }
  | { sealed: false; responses: ResponseWithSupplierOrg[] };

export class OrganizationResponseError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "OrganizationResponseError";
    this.code = code;
  }
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(url && key)) {
    throw new Error("Database is not configured on this deployment.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToOrganizationResponse(
  row: Record<string, unknown>
): OrganizationResponse {
  return {
    id: row.id as string,
    invitationId: (row.invitation_id as string) || null,
    isWithdrawn: Boolean(row.is_withdrawn),
    pricing: (row.pricing as Record<string, unknown>) || null,
    proposalDocumentPath: (row.proposal_document_path as string) || null,
    proposalText: (row.proposal_text as string) || null,
    requestId: row.request_id as string,
    submittedAt: row.submitted_at as string,
    supplierOrgId: row.supplier_org_id as string,
    vendorId: row.vendor_id as string,
  };
}

async function loadOrganization(organizationId: string) {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, is_supplier")
    .eq("id", organizationId)
    .maybeSingle();
  return data;
}

// The organization equivalent of getVendorInvitation, scoped by
// supplier_org_id instead of vendor_id - the one column M4A's invitation
// bridge added.
async function getSupplierOrgInvitation(
  supplierOrgId: string,
  requestId: string
): Promise<{ id: string; status: string } | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("procurement_invitations")
    .select("id, status")
    .eq("supplier_org_id", supplierOrgId)
    .eq("request_id", requestId)
    .maybeSingle();
  return data ? { id: data.id as string, status: data.status as string } : null;
}

// Shared gate for everything a supplier organization does against a
// request - submit, upload, withdraw - so no entry point can be reached by
// an organization submitResponse would have refused. Mirrors
// assertVendorMaySubmit in response-actions.ts exactly, substituting
// organization membership/capability for a bare vendor id, and the
// organization's own invitation lookup for the vendor one.
export async function assertSupplierOrgMaySubmit(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string
): Promise<{
  invitation: { id: string; status: string } | null;
  request: ProcurementRequest;
}> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new OrganizationResponseError("Request not found.", "not_found");
  }
  // A submitted quotation is a binding offer on the business's behalf, the
  // same weight as issuing an RFQ - so it gets the same owner/admin bar
  // createOrganizationRequest and the organization profile use, not just
  // any active member.
  if (!canManageOrganization(role)) {
    throw new OrganizationResponseError(
      "Only an owner or admin can submit a quotation for this business.",
      "forbidden"
    );
  }
  const organization = await loadOrganization(organizationId);
  if (!organization?.is_supplier) {
    throw new OrganizationResponseError(
      "This business is not set up as a supplier. Enable the supplier capability first.",
      "not_supplier"
    );
  }

  const request = await getRequestById(requestId);
  if (!request) {
    throw new OrganizationResponseError("Request not found.", "not_found");
  }

  const window = isSubmissionWindowOpen(
    request.status,
    request.responseDeadline
  );
  if (!window.open) {
    throw new OrganizationResponseError(window.reason, "invalid_state");
  }

  const invitation = await getSupplierOrgInvitation(organizationId, requestId);
  // Buyer/supplier identities stay distinct even for a dual-capability
  // account: an organization-owned request is invite_only by construction
  // (see createOrganizationRequest), so without a real invitation to THIS
  // organization there is nothing to submit against - reusing the same
  // eligibility predicate the vendor path uses, since the rule (open
  // visibility, or a respondable invitation status) does not depend on what
  // kind of identity is submitting.
  const eligibility = canVendorSubmitResponse(
    request.visibility,
    invitation?.status ?? null
  );
  if (!eligibility.allowed) {
    throw new OrganizationResponseError(eligibility.reason, "not_invited");
  }

  return { invitation, request };
}

export async function submitOrganizationResponse(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string,
  input: SubmitResponseInput
): Promise<OrganizationResponse> {
  const { invitation } = await assertSupplierOrgMaySubmit(
    member,
    organizationId,
    requestId
  );

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_responses")
    .insert({
      invitation_id: invitation?.id ?? null,
      pricing: input.pricing,
      proposal_document_path: input.proposalDocumentPath,
      proposal_text: input.proposalText,
      request_id: requestId,
      // vendor_id stays null: this response is owned by the organization,
      // and the XOR constraint enforces exactly one identity.
      supplier_org_id: organizationId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new OrganizationResponseError(
        "You have already submitted a response to this request.",
        "duplicate"
      );
    }
    throw new OrganizationResponseError(
      error.message || "Failed to submit the response.",
      "insert_failed"
    );
  }

  if (invitation) {
    await supabase
      .from("procurement_invitations")
      .update({ responded_at: new Date().toISOString(), status: "responded" })
      .eq("id", invitation.id);
  }

  const response = rowToOrganizationResponse(data);
  await logAudit(requestId, member.memberId, member.memberType, "submitted", {
    supplierOrgId: organizationId,
  });
  return response;
}

// Bounded by the same window as submission, for the same reason M0 bounds
// the vendor path: once a request closes, its bids are part of the pool the
// buyer evaluates and awards from.
export async function withdrawOrganizationResponse(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string
): Promise<void> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new OrganizationResponseError("Request not found.", "not_found");
  }

  const request = await getRequestById(requestId);
  if (!request) {
    throw new OrganizationResponseError("Request not found.", "not_found");
  }
  const window = isSubmissionWindowOpen(
    request.status,
    request.responseDeadline
  );
  if (!window.open) {
    throw new OrganizationResponseError(window.reason, "invalid_state");
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_responses")
    .update({ is_withdrawn: true })
    .eq("request_id", requestId)
    .eq("supplier_org_id", organizationId)
    .eq("is_withdrawn", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new OrganizationResponseError(
      error.message || "Failed to withdraw the response.",
      "update_failed"
    );
  }
  if (data) {
    await logAudit(requestId, member.memberId, member.memberType, "withdrawn", {
      supplierOrgId: organizationId,
    });
  }
}

export async function getMyOrganizationResponse(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string
): Promise<OrganizationResponse | null> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new OrganizationResponseError("Request not found.", "not_found");
  }
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("procurement_responses")
    .select("*")
    .eq("request_id", requestId)
    .eq("supplier_org_id", organizationId)
    .maybeSingle();
  return data ? rowToOrganizationResponse(data) : null;
}

// Buyer-side, organization-scoped equivalent of listResponsesForRequest.
// Ownership-scoped via getOrganizationRequest first - a request belonging to
// another organization is "not found", matching every other M4A entry
// point - then the identical sealed-bid branch: a sealed, unopened request
// returns a count only, and the response rows are never selected.
//
// This milestone does not add an organization-aware openBids(): opening
// sealed bids is an evaluation-stage action, and M4A/M4B1 only create and
// close the submission window, never evaluate. The existing employer-scoped
// openBids() cannot move an organization-owned request's status (it filters
// by buyer_id, which is null there), so a sealed organization-owned request
// currently has no path past closed_for_responses. That gap is explicitly
// left for M4B2, not improvised here.
export async function listOrganizationResponsesForRequest(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string
): Promise<OrganizationResponsesView> {
  const request = await getOrganizationRequest(
    member,
    organizationId,
    requestId
  );

  const supabase = getAdminClient();
  const sealed = isSealedFromBuyer(request.sealedBids, request.status);

  if (sealed) {
    const { count, error } = await supabase
      .from("procurement_responses")
      .select("id", { count: "exact", head: true })
      .eq("request_id", requestId)
      .eq("is_withdrawn", false);
    if (error) {
      throw new OrganizationResponseError(
        error.message || "Failed to load response count.",
        "query_failed"
      );
    }
    return { count: count ?? 0, sealed: true };
  }

  const { data, error } = await supabase
    .from("procurement_responses")
    .select("*, organizations!procurement_responses_supplier_org_id_fkey(name)")
    .eq("request_id", requestId)
    .not("supplier_org_id", "is", null)
    .order("submitted_at", { ascending: true });
  if (error) {
    throw new OrganizationResponseError(
      error.message || "Failed to load responses.",
      "query_failed"
    );
  }

  await logAudit(
    requestId,
    member.memberId,
    member.memberType,
    "viewed_responses",
    { supplierOrgId: organizationId }
  );

  return {
    responses: ((data ?? []) as Record<string, unknown>[]).map((row) => {
      const embedded: unknown = row.organizations;
      const org = (Array.isArray(embedded) ? embedded[0] : embedded) as
        | { name: string }
        | null
        | undefined;
      return {
        ...rowToOrganizationResponse(row),
        supplierOrgName: org?.name ?? null,
      };
    }),
    sealed: false,
  };
}
