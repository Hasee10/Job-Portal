import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  canManageOrganization,
  getMemberRole,
  type OrganizationMemberRef,
} from "./organization-actions";

// Buyer-supplier relationships between organizations.
//
// One row is one trading relationship with a direction, because the same two
// businesses can trade both ways: a supplier of components is a buyer of
// everything else. "Who is buying" is the question the approved supplier
// list answers, so it is stored rather than inferred from who asked first.
//
// A buyer accepting a supplier means that buyer is willing to do business
// with them. It is not a statement by JobLo about the supplier's legitimacy,
// certificates or finances - nothing here verifies any of that, and nothing
// in the UI should suggest otherwise.
export type ConnectionStatus = "pending" | "accepted" | "rejected";
// From the initiating organization's point of view, which is how a person
// thinks about it: "we want to buy from them" or "we want to supply them".
export type ConnectionDirection = "we_buy" | "we_supply";
export interface OrganizationSummary {
  id: string;
  industry: string | null;
  isBuyer: boolean;
  isSupplier: boolean;
  location: string | null;
  name: string;
}
export interface OrganizationConnection {
  buyerOrgId: string;
  counterpart: OrganizationSummary | null;
  createdAt: string;
  id: string;
  // True when the organization being viewed is the buyer in this
  // relationship, so the UI does not have to work it out again.
  isBuyer: boolean;
  // True when the organization being viewed sent the request.
  isRequester: boolean;
  message: string | null;
  recipientOrgId: string;
  requesterOrgId: string;
  respondedAt: string | null;
  status: ConnectionStatus;
  supplierOrgId: string;
}
export interface ConnectionLists {
  accepted: OrganizationConnection[];
  incoming: OrganizationConnection[];
  outgoing: OrganizationConnection[];
  rejected: OrganizationConnection[];
}
export class ConnectionError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ConnectionError";
    this.code = code;
  }
}
// The fields a counterpart business may see about the other side. The same
// restraint as the public directory projection: name and trading capability,
// nothing internal, no membership and no contact details.
const COUNTERPART_COLUMNS =
  "id, name, industry, location, is_buyer, is_supplier";
function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(url && key)) {
    throw new ConnectionError(
      "Database is not configured on this deployment.",
      "db_unavailable"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
function rowToSummary(row: Record<string, unknown>): OrganizationSummary {
  return {
    id: row.id as string,
    industry: (row.industry as string) || null,
    isBuyer: Boolean(row.is_buyer),
    isSupplier: Boolean(row.is_supplier),
    location: (row.location as string) || null,
    name: row.name as string,
  };
}
// Pure, so the rules are testable without a database - the convention the
// other procurement modules follow.
export function resolveParties(
  fromOrganizationId: string,
  toOrganizationId: string,
  direction: ConnectionDirection
): { buyerOrgId: string; supplierOrgId: string } {
  return direction === "we_buy"
    ? { buyerOrgId: fromOrganizationId, supplierOrgId: toOrganizationId }
    : { buyerOrgId: toOrganizationId, supplierOrgId: fromOrganizationId };
}
// A relationship only makes sense if each side can play its part: a business
// that does not supply cannot be anyone's supplier.
export function validateConnectionCapabilities(
  buyer: Pick<OrganizationSummary, "isBuyer" | "name">,
  supplier: Pick<OrganizationSummary, "isSupplier" | "name">
): { reason: string; valid: false } | { valid: true } {
  if (!buyer.isBuyer) {
    return {
      reason: `${buyer.name} is not set up as a buyer.`,
      valid: false,
    };
  }
  if (!supplier.isSupplier) {
    return {
      reason: `${supplier.name} is not set up as a supplier.`,
      valid: false,
    };
  }
  return { valid: true };
}
async function requireManager(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<void> {
  const role = await getMemberRole(member, organizationId);
  // Identical message for "no such organization" and "not your
  // organization", so knowing a UUID reveals nothing.
  if (!role) {
    throw new ConnectionError("Organization not found.", "not_found");
  }
  // Starting or accepting a trading relationship commits the business, so it
  // takes a manager - the same bar as editing the public profile.
  if (!canManageOrganization(role)) {
    throw new ConnectionError(
      "Only an owner or admin can manage business connections.",
      "forbidden"
    );
  }
}
async function loadOrganizations(
  ids: string[]
): Promise<Map<string, OrganizationSummary>> {
  if (ids.length === 0) {
    return new Map();
  }
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select(COUNTERPART_COLUMNS)
    .in("id", [...new Set(ids)]);
  const summaries = new Map<string, OrganizationSummary>();
  for (const row of data ?? []) {
    const summary = rowToSummary(row as Record<string, unknown>);
    summaries.set(summary.id, summary);
  }
  return summaries;
}
function rowToConnection(
  row: Record<string, unknown>,
  viewerOrgId: string,
  summaries: Map<string, OrganizationSummary>
): OrganizationConnection {
  const requesterOrgId = row.requester_org_id as string;
  const recipientOrgId = row.recipient_org_id as string;
  const buyerOrgId = row.buyer_org_id as string;
  const counterpartId =
    requesterOrgId === viewerOrgId ? recipientOrgId : requesterOrgId;
  return {
    buyerOrgId,
    counterpart: summaries.get(counterpartId) ?? null,
    createdAt: row.created_at as string,
    id: row.id as string,
    isBuyer: buyerOrgId === viewerOrgId,
    isRequester: requesterOrgId === viewerOrgId,
    message: (row.message as string) || null,
    recipientOrgId,
    requesterOrgId,
    respondedAt: (row.responded_at as string) || null,
    status: row.status as ConnectionStatus,
    supplierOrgId: row.supplier_org_id as string,
  };
}
export async function requestConnection(
  member: OrganizationMemberRef,
  input: {
    direction: ConnectionDirection;
    fromOrganizationId: string;
    message?: string | null;
    toOrganizationId: string;
  }
): Promise<OrganizationConnection> {
  const { fromOrganizationId, toOrganizationId, direction } = input;
  if (fromOrganizationId === toOrganizationId) {
    throw new ConnectionError(
      "A business cannot connect to itself.",
      "self_connection"
    );
  }
  await requireManager(member, fromOrganizationId);
  const supabase = getAdminClient();
  const from = await loadOrganizations([fromOrganizationId]);
  const sender = from.get(fromOrganizationId);
  if (!sender) {
    throw new ConnectionError("Organization not found.", "not_found");
  }
  // The target must be publicly listed. Reaching a business that has not
  // opted into discovery, by knowing its UUID, would both leak its existence
  // and bypass the consent the directory is built on.
  const { data: targetRow } = await supabase
    .from("organizations")
    .select(COUNTERPART_COLUMNS)
    .eq("id", toOrganizationId)
    .eq("is_public", true)
    .maybeSingle();
  if (!targetRow) {
    throw new ConnectionError("Business not found.", "not_found");
  }
  const target = rowToSummary(targetRow as Record<string, unknown>);
  const { buyerOrgId, supplierOrgId } = resolveParties(
    fromOrganizationId,
    toOrganizationId,
    direction
  );
  const buyer = buyerOrgId === sender.id ? sender : target;
  const supplier = supplierOrgId === sender.id ? sender : target;
  const capabilities = validateConnectionCapabilities(buyer, supplier);
  if (!capabilities.valid) {
    throw new ConnectionError(capabilities.reason, "invalid_capabilities");
  }
  const { data, error } = await supabase
    .from("organization_connections")
    .insert({
      buyer_org_id: buyerOrgId,
      message: input.message?.trim() || null,
      recipient_org_id: toOrganizationId,
      requested_by_id: member.memberId,
      requested_by_type: member.memberType,
      requester_org_id: fromOrganizationId,
      supplier_org_id: supplierOrgId,
    })
    .select("*")
    .single();
  if (error) {
    // The partial unique index on (buyer_org_id, supplier_org_id) for active
    // rows. Two simultaneous requests both pass any check done beforehand,
    // so the database is what actually prevents the duplicate.
    if (error.code === "23505") {
      throw new ConnectionError(
        "There is already a pending or accepted relationship in that direction.",
        "duplicate"
      );
    }
    throw new ConnectionError(
      error.message || "Failed to send the request.",
      "insert_failed"
    );
  }
  const summaries = await loadOrganizations([toOrganizationId]);
  return rowToConnection(data, fromOrganizationId, summaries);
}
export async function listConnections(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<ConnectionLists> {
  // Reading the other side of a relationship is still organization-scoped:
  // membership is required, not merely knowing the id.
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new ConnectionError("Organization not found.", "not_found");
  }
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organization_connections")
    .select("*")
    .or(
      `requester_org_id.eq.${organizationId},recipient_org_id.eq.${organizationId}`
    )
    .order("created_at", { ascending: false });
  if (error) {
    throw new ConnectionError(
      error.message || "Failed to load connections.",
      "query_failed"
    );
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  const counterpartIds = rows.map((row) =>
    row.requester_org_id === organizationId
      ? (row.recipient_org_id as string)
      : (row.requester_org_id as string)
  );
  const summaries = await loadOrganizations(counterpartIds);
  const all = rows.map((row) =>
    rowToConnection(row, organizationId, summaries)
  );
  return {
    accepted: all.filter((c) => c.status === "accepted"),
    incoming: all.filter((c) => c.status === "pending" && !c.isRequester),
    outgoing: all.filter((c) => c.status === "pending" && c.isRequester),
    rejected: all.filter((c) => c.status === "rejected"),
  };
}
export async function respondToConnection(
  member: OrganizationMemberRef,
  connectionId: string,
  decision: "accepted" | "rejected"
): Promise<OrganizationConnection> {
  const supabase = getAdminClient();
  const { data: existing } = await supabase
    .from("organization_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();
  if (!existing) {
    throw new ConnectionError("Request not found.", "not_found");
  }
  // Only the side that received the request may answer it. Checked against
  // the row's own recipient_org_id rather than anything the caller sent, so
  // knowing a connection id is not enough to accept on someone's behalf.
  const recipientOrgId = existing.recipient_org_id as string;
  await requireManager(member, recipientOrgId);
  // Guarded by status in the predicate, so a request cannot move from
  // accepted to rejected later, and two concurrent responses cannot both
  // take effect - the second matches no row.
  const { data, error } = await supabase
    .from("organization_connections")
    .update({
      responded_at: new Date().toISOString(),
      responded_by_id: member.memberId,
      responded_by_type: member.memberType,
      status: decision,
    })
    .eq("id", connectionId)
    .eq("recipient_org_id", recipientOrgId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) {
    throw new ConnectionError(
      error.message || "Failed to update the request.",
      "update_failed"
    );
  }
  if (!data) {
    throw new ConnectionError(
      "That request has already been answered.",
      "not_pending"
    );
  }
  const summaries = await loadOrganizations([data.requester_org_id as string]);
  return rowToConnection(data, recipientOrgId, summaries);
}
// The buyer's approved supplier network: the suppliers it has accepted a
// relationship with. Approval by this buyer only - it carries no platform
// verification of the supplier, and must not be presented as one.
export async function listApprovedSuppliers(
  member: OrganizationMemberRef,
  buyerOrganizationId: string
): Promise<OrganizationSummary[]> {
  const role = await getMemberRole(member, buyerOrganizationId);
  if (!role) {
    throw new ConnectionError("Organization not found.", "not_found");
  }
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organization_connections")
    .select("supplier_org_id")
    .eq("buyer_org_id", buyerOrganizationId)
    .eq("status", "accepted");
  if (error) {
    throw new ConnectionError(
      error.message || "Failed to load approved suppliers.",
      "query_failed"
    );
  }
  const ids = (data ?? []).map((row) => row.supplier_org_id as string);
  const summaries = await loadOrganizations(ids);
  return ids
    .map((id) => summaries.get(id))
    .filter((summary): summary is OrganizationSummary => Boolean(summary))
    .sort((a, b) => a.name.localeCompare(b.name));
}
