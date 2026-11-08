import "server-only";

import { createClient } from "@supabase/supabase-js";
import { logAudit } from "./audit-actions";
import { getVendorInvitation } from "./invitation-actions";
import { getRequestById, getRequestForBuyer } from "./request-actions";

export type ProcurementResponse = {
  id: string;
  requestId: string;
  vendorId: string;
  invitationId: string | null;
  pricing: Record<string, unknown> | null;
  proposalText: string | null;
  proposalDocumentPath: string | null;
  submittedAt: string;
  isWithdrawn: boolean;
};

export type ResponseWithVendor = ProcurementResponse & {
  vendorCompanyName: string | null;
};

// Sealed-bid requests hide response content from the buyer - not just from
// other vendors - until a deliberate, deadline-gated "open bids" action.
// This discriminated union makes that boundary a type-level guarantee: a
// caller that only handles the `sealed: true` branch physically cannot leak
// response content, because the content fields don't exist on that variant.
export type ResponsesView =
  | { sealed: true; count: number }
  | { sealed: false; responses: ResponseWithVendor[] };

export type SubmitResponseInput = {
  pricing: Record<string, unknown> | null;
  proposalText: string | null;
  proposalDocumentPath: string | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(url && key)) {
    throw new Error("Database is not configured on this deployment.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }
  const message = (error as { message?: string } | null)?.message;
  return new Error(message || fallback);
}

function rowToResponse(row: Record<string, unknown>): ProcurementResponse {
  return {
    id: row.id as string,
    invitationId: (row.invitation_id as string) || null,
    isWithdrawn: Boolean(row.is_withdrawn),
    pricing: (row.pricing as Record<string, unknown>) || null,
    proposalDocumentPath: (row.proposal_document_path as string) || null,
    proposalText: (row.proposal_text as string) || null,
    requestId: row.request_id as string,
    submittedAt: row.submitted_at as string,
    vendorId: row.vendor_id as string,
  };
}

const RESPONDABLE_INVITATION_STATUSES = [
  "invited",
  "viewed",
  "prequalification_approved",
];
const OPEN_RESPONSE_STATUSES = ["bids_opened", "evaluating", "awarded"];
const EVALUATABLE_STATUSES = ["bids_opened", "closed_for_responses"];

// Pure, DB-free predicates - pulled out of submitResponse/listResponsesForRequest
// so the two compliance-critical rules (who can submit, when a buyer can see
// content) are unit-testable without a live database.
export function canVendorSubmitResponse(
  requestVisibility: "open" | "invite_only",
  invitationStatus: string | null
): { allowed: true } | { allowed: false; reason: string } {
  if (requestVisibility === "open") {
    return { allowed: true };
  }
  if (!invitationStatus) {
    return {
      allowed: false,
      reason: "You have not been invited to this request.",
    };
  }
  if (RESPONDABLE_INVITATION_STATUSES.includes(invitationStatus)) {
    return { allowed: true };
  }
  if (invitationStatus === "prequalification_pending") {
    return {
      allowed: false,
      reason: "Your prequalification is still pending buyer approval.",
    };
  }
  if (invitationStatus === "prequalification_rejected") {
    return {
      allowed: false,
      reason: "Your prequalification for this request was not approved.",
    };
  }
  return {
    allowed: false,
    reason: "You cannot submit a response to this invitation.",
  };
}

export function isSealedFromBuyer(
  sealedBids: boolean,
  status: string
): boolean {
  return sealedBids && !OPEN_RESPONSE_STATUSES.includes(status);
}

// The window during which a vendor may change what they have on the table -
// submitting, uploading a proposal document, or withdrawing. All three share
// one definition so a document can never be attached to, or a bid pulled
// from, a request that is no longer open.
export function isSubmissionWindowOpen(
  status: string,
  responseDeadline: string | null,
  now: Date = new Date()
): { open: true } | { open: false; reason: string } {
  if (status !== "published") {
    return {
      open: false,
      reason: "This request is not currently accepting responses.",
    };
  }
  if (responseDeadline && now > new Date(responseDeadline)) {
    return {
      open: false,
      reason: "The response deadline for this request has passed.",
    };
  }
  return { open: true };
}

// A sealed request must pass through openBids() before evaluation. Without
// this, moving straight from closed_for_responses to evaluating would make
// every bid readable (evaluating is in OPEN_RESPONSE_STATUSES) while
// skipping the deadline check and the bids_opened audit entry that openBids
// exists to produce.
export function canStartEvaluation(
  sealedBids: boolean,
  status: string
): { allowed: true } | { allowed: false; reason: string } {
  if (!EVALUATABLE_STATUSES.includes(status)) {
    return {
      allowed: false,
      reason: "This request is not ready for evaluation yet.",
    };
  }
  if (sealedBids && status !== "bids_opened") {
    return {
      allowed: false,
      reason: "Sealed bids must be opened before evaluation can start.",
    };
  }
  return { allowed: true };
}

// Shared gate for everything a vendor does against an open request, so the
// upload endpoint cannot be reached by a vendor that submitResponse would
// have rejected. Returns the invitation too, since submitResponse records it.
export async function assertVendorMaySubmit(
  vendorId: string,
  requestId: string
): Promise<{
  request: Awaited<ReturnType<typeof getRequestById>>;
  invitation: Awaited<ReturnType<typeof getVendorInvitation>>;
}> {
  const request = await getRequestById(requestId);
  if (!request) {
    throw new Error("Request not found.");
  }

  const window = isSubmissionWindowOpen(
    request.status,
    request.responseDeadline
  );
  if (!window.open) {
    throw new Error(window.reason);
  }

  const invitation = await getVendorInvitation(vendorId, requestId);
  const eligibility = canVendorSubmitResponse(
    request.visibility,
    invitation?.status ?? null
  );
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason);
  }

  return { invitation, request };
}

export async function submitResponse(
  vendorId: string,
  requestId: string,
  input: SubmitResponseInput
): Promise<ProcurementResponse> {
  const { invitation } = await assertVendorMaySubmit(vendorId, requestId);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_responses")
    .insert({
      invitation_id: invitation?.id ?? null,
      pricing: input.pricing,
      proposal_document_path: input.proposalDocumentPath,
      proposal_text: input.proposalText,
      request_id: requestId,
      vendor_id: vendorId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already submitted a response to this request.");
    }
    throw toError(error, "Failed to submit response.");
  }

  if (invitation) {
    await supabase
      .from("procurement_invitations")
      .update({ responded_at: new Date().toISOString(), status: "responded" })
      .eq("id", invitation.id);
  }

  const response = rowToResponse(data);
  await logAudit(requestId, vendorId, "vendor", "submitted");
  return response;
}

// Withdrawal is bounded by the same window as submission. Once a request
// closes, its bids are part of the pool the buyer evaluates and awards from,
// so pulling one out afterwards would let a vendor retract a bid during (or
// after) evaluation - including one that had already been awarded.
export async function withdrawResponse(
  vendorId: string,
  requestId: string
): Promise<void> {
  const request = await getRequestById(requestId);
  if (!request) {
    throw new Error("Request not found.");
  }
  const window = isSubmissionWindowOpen(
    request.status,
    request.responseDeadline
  );
  if (!window.open) {
    throw new Error(window.reason);
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_responses")
    .update({ is_withdrawn: true })
    .eq("request_id", requestId)
    .eq("vendor_id", vendorId)
    .eq("is_withdrawn", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw toError(error, "Failed to withdraw response.");
  }
  if (data) {
    await logAudit(requestId, vendorId, "vendor", "withdrawn");
  }
}

export async function getMyResponse(
  vendorId: string,
  requestId: string
): Promise<ProcurementResponse | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("procurement_responses")
    .select("*")
    .eq("request_id", requestId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  return data ? rowToResponse(data) : null;
}

// The core sealed-bid enforcement point. Ownership-scoped via
// getRequestForBuyer first, then: if the request isn't sealed, or it's
// already past the bids_opened transition, return full content. Otherwise
// return a count only - the response rows are never even selected in that
// branch, so there's no accidental content leak via an unused query result.
export async function listResponsesForRequest(
  buyerId: string,
  requestId: string
): Promise<ResponsesView> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) {
    throw new Error("Request not found.");
  }

  const supabase = getAdminClient();
  const sealed = isSealedFromBuyer(request.sealedBids, request.status);

  if (sealed) {
    const { count, error } = await supabase
      .from("procurement_responses")
      .select("id", { count: "exact", head: true })
      .eq("request_id", requestId)
      .eq("is_withdrawn", false);
    if (error) {
      throw toError(error, "Failed to load response count.");
    }
    return { count: count ?? 0, sealed: true };
  }

  const { data, error } = await supabase
    .from("procurement_responses")
    .select("*, vendor_accounts(company_name)")
    .eq("request_id", requestId)
    .order("submitted_at", { ascending: true });
  if (error) {
    throw toError(error, "Failed to load responses.");
  }

  await logAudit(requestId, buyerId, "employer", "viewed_responses");

  return {
    responses: (data ?? []).map((row) => {
      const vendor = row.vendor_accounts as Record<string, unknown> | null;
      return {
        ...rowToResponse(row),
        vendorCompanyName: (vendor?.company_name as string) || null,
      };
    }),
    sealed: false,
  };
}

// Buyer-triggered, deadline-gated, audit-logged. This is the one and only
// way a sealed request's bids become visible - never automatic (the cron
// sweep closes requests for new submissions but deliberately never calls
// this), so there's always a specific, attributable actor and timestamp for
// when sealed content was exposed.
export async function openBids(
  buyerId: string,
  requestId: string
): Promise<void> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) {
    throw new Error("Request not found.");
  }
  if (!request.sealedBids) {
    throw new Error("This request does not use sealed bidding.");
  }
  if (request.status !== "closed_for_responses") {
    throw new Error(
      "This request must be closed for responses before bids can be opened."
    );
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("procurement_requests")
    .update({ status: "bids_opened" })
    .eq("id", requestId)
    .eq("buyer_id", buyerId)
    .eq("status", "closed_for_responses");

  if (error) {
    throw toError(error, "Failed to open bids.");
  }
  await logAudit(requestId, buyerId, "employer", "bids_opened");
}
