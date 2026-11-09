import "server-only";

import { createClient } from "@supabase/supabase-js";
import { logAudit } from "./audit-actions";

export type ProcurementType = "rfi" | "rfq" | "rfp" | "tender";
export type ProcurementStatus =
  | "draft"
  | "published"
  | "closed_for_responses"
  | "bids_opened"
  | "evaluating"
  | "awarded"
  | "cancelled";
export type ProcurementVisibility = "open" | "invite_only";

export type SpecField = {
  label: string;
  value: string;
  fieldType?: string;
};

export type ProcurementRequest = {
  id: string;
  buyerId: string;
  type: ProcurementType;
  category: string;
  title: string;
  description: string;
  specFields: SpecField[];
  status: ProcurementStatus;
  visibility: ProcurementVisibility;
  sealedBids: boolean;
  requiresPrequalification: boolean;
  responseDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  awardedAt: string | null;
  awardedResponseId: string | null;
};

export type ProcurementRequestInput = {
  type: ProcurementType;
  category: string;
  title: string;
  description: string;
  specFields: SpecField[];
  visibility: ProcurementVisibility;
  sealedBids: boolean;
  requiresPrequalification: boolean;
  responseDeadline: string | null;
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

export function specFieldsToJson(fields: SpecField[]): Record<string, unknown>[] {
  return fields.map((f) => ({
    field_type: f.fieldType ?? null,
    label: f.label,
    value: f.value,
  }));
}

function jsonToSpecFields(value: unknown): SpecField[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((f) => ({
    fieldType: (f as { field_type?: string }).field_type ?? undefined,
    label: (f as { label?: string }).label ?? "",
    value: (f as { value?: string }).value ?? "",
  }));
}

export function rowToRequest(row: Record<string, unknown>): ProcurementRequest {
  return {
    awardedAt: (row.awarded_at as string) || null,
    awardedResponseId: (row.awarded_response_id as string) || null,
    buyerId: row.buyer_id as string,
    category: row.category as string,
    createdAt: row.created_at as string,
    description: row.description as string,
    id: row.id as string,
    publishedAt: (row.published_at as string) || null,
    requiresPrequalification: Boolean(row.requires_prequalification),
    responseDeadline: (row.response_deadline as string) || null,
    sealedBids: Boolean(row.sealed_bids),
    specFields: jsonToSpecFields(row.spec_fields),
    status: row.status as ProcurementStatus,
    title: row.title as string,
    type: row.type as ProcurementType,
    updatedAt: row.updated_at as string,
    visibility: row.visibility as ProcurementVisibility,
  };
}

export async function createRequest(
  buyerId: string,
  input: ProcurementRequestInput
): Promise<ProcurementRequest> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("procurement_requests")
    .insert({
      buyer_id: buyerId,
      category: input.category,
      description: input.description,
      requires_prequalification: input.requiresPrequalification,
      response_deadline: input.responseDeadline,
      sealed_bids: input.sealedBids,
      spec_fields: specFieldsToJson(input.specFields),
      title: input.title,
      type: input.type,
      visibility: input.visibility,
    })
    .select("*")
    .single();

  if (error) {
    throw toError(error, "Failed to create request.");
  }

  const request = rowToRequest(data);
  await logAudit(request.id, buyerId, "employer", "created", {
    type: request.type,
  });
  return request;
}

export async function listBuyerRequests(
  buyerId: string
): Promise<ProcurementRequest[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw toError(error, "Failed to load requests.");
  }
  return (data ?? []).map(rowToRequest);
}

// Ownership-scoped at the query level - a stray id for someone else's
// request returns null rather than leaking it, same pattern as
// getOwnerJob() in lib/jobs/employer-job-actions.ts.
export async function getRequestForBuyer(
  buyerId: string,
  requestId: string
): Promise<ProcurementRequest | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("id", requestId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  return data ? rowToRequest(data) : null;
}

// Unscoped internal lookup - only for callers (invitation/response/document
// actions) that have already verified access through some other path (e.g.
// an existing invitation row for the calling vendor). Never expose this
// directly to a route without an ownership/invitation check first.
export async function getRequestById(
  requestId: string
): Promise<ProcurementRequest | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  return data ? rowToRequest(data) : null;
}

export async function publishRequest(
  buyerId: string,
  requestId: string
): Promise<ProcurementRequest> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("procurement_requests")
    .update({ published_at: new Date().toISOString(), status: "published" })
    .eq("id", requestId)
    .eq("buyer_id", buyerId)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) {
    throw toError(
      error,
      "Failed to publish request. It may already be published."
    );
  }

  const request = rowToRequest(data);
  await logAudit(request.id, buyerId, "employer", "published");
  return request;
}

export async function closeForResponses(
  buyerId: string,
  requestId: string
): Promise<ProcurementRequest> {
  const existing = await getRequestForBuyer(buyerId, requestId);
  if (!existing) {
    throw new Error("Request not found.");
  }

  // A sealed-bid request can't be closed early - that would let a buyer cut
  // off submissions before the advertised deadline, which is exactly the
  // kind of one-sided control a sealed process exists to prevent.
  if (
    existing.sealedBids &&
    existing.responseDeadline &&
    new Date() < new Date(existing.responseDeadline)
  ) {
    throw new Error(
      "Cannot close a sealed-bid request before its response deadline."
    );
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .update({ status: "closed_for_responses" })
    .eq("id", requestId)
    .eq("buyer_id", buyerId)
    .eq("status", "published")
    .select("*")
    .single();

  if (error) {
    throw toError(error, "Failed to close request for responses.");
  }

  const request = rowToRequest(data);
  await logAudit(request.id, buyerId, "employer", "closed_for_responses");
  return request;
}

// Cron-only lookups (no buyer scoping - callers are trusted server jobs, not
// user-facing routes).
export async function listPublishedRequestsPastDeadline(): Promise<
  ProcurementRequest[]
> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("status", "published")
    .not("response_deadline", "is", null)
    .lt("response_deadline", new Date().toISOString());

  if (error) {
    throw toError(error, "Failed to load requests past deadline.");
  }
  return (data ?? []).map(rowToRequest);
}

// Requests still published whose deadline falls within the next `hoursAhead`
// hours - used to send a one-time reminder. No dedupe column is needed: the
// cron runs once daily, the window is 24h, and a request leaves 'published'
// (via listPublishedRequestsPastDeadline, swept first) the moment its
// deadline passes - so each request can only ever match this window on a
// single day's run.
export async function listRequestsWithUpcomingDeadline(
  hoursAhead: number
): Promise<ProcurementRequest[]> {
  const supabase = getAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("status", "published")
    .not("response_deadline", "is", null)
    .gte("response_deadline", now.toISOString())
    .lte("response_deadline", windowEnd.toISOString());

  if (error) {
    throw toError(error, "Failed to load requests with upcoming deadlines.");
  }
  return (data ?? []).map(rowToRequest);
}

export async function cancelRequest(
  buyerId: string,
  requestId: string
): Promise<ProcurementRequest> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("procurement_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("buyer_id", buyerId)
    .not("status", "in", "(awarded,cancelled)")
    .select("*")
    .single();

  if (error) {
    throw toError(error, "Failed to cancel request.");
  }

  const request = rowToRequest(data);
  await logAudit(request.id, buyerId, "employer", "cancelled");
  return request;
}
