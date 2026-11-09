import "server-only";
import { createClient } from "@supabase/supabase-js";
import { logAudit } from "./audit-actions";
import {
  canManageOrganization,
  getMemberRole,
  type OrganizationMemberRef,
} from "./organization-actions";
import {
  type ProcurementRequest,
  type ProcurementRequestInput,
  rowToRequest,
  specFieldsToJson,
} from "./request-actions";

// M4A: procurement requests owned by a canonical organization, invited to
// supplier organizations the buyer has already approved.
//
// This is the existing RFx engine with an organization identity attached, not
// a parallel one: the same procurement_requests and procurement_invitations
// tables, the same statuses, the same audit log. Legacy employer-owned
// requests continue to flow through request-actions.ts untouched.
//
// Authorization is entirely in this layer. The server client holds
// service_role and bypasses RLS, so each function re-derives from the
// database: active membership, the organization's capability, the member's
// authority, and - for invitations - that the supplier is approved by THIS
// buyer. Nothing is taken on trust from the caller.

export interface SupplierInvitation {
  invitedAt: string;
  status: string;
  supplierOrgId: string;
  supplierOrgName: string | null;
}

export interface SupplierOpportunity {
  invitationStatus: string;
  invitedAt: string;
  request: ProcurementRequest;
}

export class OrganizationRfqError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "OrganizationRfqError";
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

async function loadOrganization(organizationId: string) {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, is_buyer, is_supplier")
    .eq("id", organizationId)
    .maybeSingle();
  return data;
}

// Issuing an RFQ commits the business to a purchase conversation, so it is
// an owner/admin action rather than something any member can do - the same
// bar the organization profile uses.
export async function assertCanIssueRfq(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<void> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new OrganizationRfqError("Organization not found.", "not_found");
  }
  if (!canManageOrganization(role)) {
    throw new OrganizationRfqError(
      "Only an owner or admin can issue procurement requests.",
      "forbidden"
    );
  }
  const organization = await loadOrganization(organizationId);
  if (!organization?.is_buyer) {
    throw new OrganizationRfqError(
      "This business is not set up as a buyer. Enable the buyer capability first.",
      "not_buyer"
    );
  }
}

export async function createOrganizationRequest(
  member: OrganizationMemberRef,
  organizationId: string,
  input: ProcurementRequestInput
): Promise<ProcurementRequest> {
  await assertCanIssueRfq(member, organizationId);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .insert({
      // buyer_id is deliberately left null: this request is owned by the
      // organization, and the XOR constraint enforces exactly one identity.
      buyer_org_id: organizationId,
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
    throw new OrganizationRfqError(
      error.message || "Failed to create the request.",
      "insert_failed"
    );
  }

  const request = rowToRequest(data);
  // The audit actor stays the individual, as it is for legacy requests.
  await logAudit(request.id, member.memberId, member.memberType, "created", {
    buyerOrgId: organizationId,
    type: request.type,
  });
  return request;
}

// Ownership-scoped read: a request belonging to another organization is
// simply not found, whether or not the id is real.
export async function getOrganizationRequest(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string
): Promise<ProcurementRequest> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new OrganizationRfqError("Request not found.", "not_found");
  }
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("id", requestId)
    .eq("buyer_org_id", organizationId)
    .maybeSingle();
  if (!data) {
    throw new OrganizationRfqError("Request not found.", "not_found");
  }
  return rowToRequest(data);
}

export async function listOrganizationRequests(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<ProcurementRequest[]> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new OrganizationRfqError("Organization not found.", "not_found");
  }
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("buyer_org_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new OrganizationRfqError(
      error.message || "Failed to load requests.",
      "query_failed"
    );
  }
  return (data ?? []).map(rowToRequest);
}

// The approved-supplier gate. A directory listing or a pending request is not
// enough: there must be an ACCEPTED connection in which this organization is
// the buyer and the invitee is the supplier. Returns the subset of the given
// ids that qualify, so the caller can report precisely which were refused.
export async function filterApprovedSuppliers(
  buyerOrgId: string,
  supplierOrgIds: string[]
): Promise<Set<string>> {
  if (supplierOrgIds.length === 0) {
    return new Set();
  }
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organization_connections")
    .select("supplier_org_id")
    .eq("buyer_org_id", buyerOrgId)
    .eq("status", "accepted")
    .in("supplier_org_id", supplierOrgIds);
  return new Set(
    ((data ?? []) as { supplier_org_id: string }[]).map(
      (row) => row.supplier_org_id
    )
  );
}

export async function inviteSupplierOrganizations(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string,
  supplierOrgIds: string[]
): Promise<{ invited: string[]; skipped: string[] }> {
  await assertCanIssueRfq(member, organizationId);
  // Re-reads the request scoped to this organization, so a forged request id
  // belonging to someone else cannot be invited against.
  const request = await getOrganizationRequest(
    member,
    organizationId,
    requestId
  );

  if (request.status === "awarded" || request.status === "cancelled") {
    throw new OrganizationRfqError(
      "This request is closed and cannot take new invitations.",
      "invalid_state"
    );
  }

  const unique = [...new Set(supplierOrgIds.filter(Boolean))];
  const approved = await filterApprovedSuppliers(organizationId, unique);
  const eligible = unique.filter((id) => approved.has(id));
  const skipped = unique.filter((id) => !approved.has(id));

  if (eligible.length === 0) {
    return { invited: [], skipped };
  }

  const supabase = getAdminClient();
  // Already-invited suppliers are filtered out rather than allowed to raise a
  // unique violation, so re-submitting the form is harmless. The partial
  // unique index is still the backstop against a concurrent double submit.
  const { data: existing } = await supabase
    .from("procurement_invitations")
    .select("supplier_org_id")
    .eq("request_id", requestId)
    .in("supplier_org_id", eligible);
  const already = new Set(
    ((existing ?? []) as { supplier_org_id: string }[]).map(
      (row) => row.supplier_org_id
    )
  );

  const toInsert = eligible.filter((id) => !already.has(id));
  if (toInsert.length > 0) {
    const { error } = await supabase.from("procurement_invitations").insert(
      toInsert.map((supplierOrgId) => ({
        request_id: requestId,
        // vendor_id stays null: this invitation names an organization.
        status: "invited",
        supplier_org_id: supplierOrgId,
      }))
    );
    if (error) {
      throw new OrganizationRfqError(
        error.message || "Failed to invite suppliers.",
        "insert_failed"
      );
    }
    await logAudit(requestId, member.memberId, member.memberType, "invited", {
      supplierOrgIds: toInsert,
    });
  }

  return { invited: toInsert, skipped };
}

// The organization equivalent of publishRequest. Same transition, same
// draft-only guard, same audit event - it exists because the legacy function
// scopes by buyer_id, which is NULL on an organization-owned request.
// Without it an organization could create an RFQ and never open it, and the
// supplier view deliberately hides drafts.
export async function publishOrganizationRequest(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string
): Promise<ProcurementRequest> {
  await assertCanIssueRfq(member, organizationId);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .update({ published_at: new Date().toISOString(), status: "published" })
    .eq("id", requestId)
    .eq("buyer_org_id", organizationId)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) {
    throw new OrganizationRfqError(
      "Failed to publish the request. It may already be published.",
      "invalid_state"
    );
  }

  const request = rowToRequest(data);
  await logAudit(request.id, member.memberId, member.memberType, "published");
  return request;
}

export async function listRequestSupplierInvitations(
  member: OrganizationMemberRef,
  organizationId: string,
  requestId: string
): Promise<SupplierInvitation[]> {
  await getOrganizationRequest(member, organizationId, requestId);

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("procurement_invitations")
    .select(
      "status, invited_at, supplier_org_id, organizations!procurement_invitations_supplier_org_id_fkey(name)"
    )
    .eq("request_id", requestId)
    .not("supplier_org_id", "is", null)
    .order("invited_at", { ascending: true });

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const embedded: unknown = row.organizations;
    const org = (Array.isArray(embedded) ? embedded[0] : embedded) as
      | { name: string }
      | null
      | undefined;
    return {
      invitedAt: row.invited_at as string,
      status: row.status as string,
      supplierOrgId: row.supplier_org_id as string,
      supplierOrgName: org?.name ?? null,
    };
  });
}

// The supplier's side: the requests this organization has been invited to.
// Driven from the invitation, never from the directory - being listed
// publicly grants nothing here.
export async function listSupplierOpportunities(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<SupplierOpportunity[]> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new OrganizationRfqError("Organization not found.", "not_found");
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("procurement_invitations")
    .select("status, invited_at, procurement_requests(*)")
    .eq("supplier_org_id", organizationId)
    .order("invited_at", { ascending: false });

  if (error) {
    throw new OrganizationRfqError(
      error.message || "Failed to load opportunities.",
      "query_failed"
    );
  }

  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const embedded: unknown = row.procurement_requests;
    const request = (Array.isArray(embedded) ? embedded[0] : embedded) as
      | Record<string, unknown>
      | null
      | undefined;
    if (!request) {
      return [];
    }
    // A draft is not an opportunity: the buyer has not published it.
    if (request.status === "draft") {
      return [];
    }
    return [
      {
        invitationStatus: row.status as string,
        invitedAt: row.invited_at as string,
        request: rowToRequest(request),
      },
    ];
  });
}
