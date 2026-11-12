import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Session } from "next-auth";

export type OrganizationRole = "admin" | "member" | "owner";
export type OrganizationMemberType = "employer" | "recruiter" | "seeker";

// Who is acting, resolved from the session only. This app has no single
// users table - identity lives in employers, recruiter_accounts or
// job_seekers depending on how the person signed in - so a member is
// identified by the pair, exactly as procurement_audit_log identifies actors.
export interface OrganizationMemberRef {
  memberId: string;
  memberType: OrganizationMemberType;
}

export interface Organization {
  categories: string[];
  companySize: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  industry: string | null;
  isBuyer: boolean;
  // Consent to appear in the public marketplace directory. Never inferred
  // from any other field - an organization is unlisted until an owner or
  // admin deliberately turns this on.
  isPublic: boolean;
  isSupplier: boolean;
  location: string | null;
  name: string;
  operatingRegions: string[];
  productsServices: string | null;
  publicContactEmail: string | null;
  updatedAt: string;
  website: string | null;
}

export interface OrganizationWithRole extends Organization {
  role: OrganizationRole;
}

export interface OrganizationMember {
  createdAt: string;
  id: string;
  memberId: string;
  memberType: OrganizationMemberType;
  organizationId: string;
  role: OrganizationRole;
}

export interface OrganizationProfileInput {
  categories: string[];
  companySize: string | null;
  description: string | null;
  industry: string | null;
  isBuyer: boolean;
  isPublic: boolean;
  isSupplier: boolean;
  location: string | null;
  name: string;
  operatingRegions: string[];
  productsServices: string | null;
  publicContactEmail: string | null;
  website: string | null;
}

// Creation deliberately takes the narrower set: a new organization is
// identity and capabilities only, and is never public on day one. Listing
// it is a separate, explicit edit.
export type OrganizationCreateInput = Pick<
  OrganizationProfileInput,
  | "companySize"
  | "description"
  | "industry"
  | "isBuyer"
  | "isSupplier"
  | "location"
  | "name"
  | "website"
>;

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

function rowToOrganization(row: Record<string, unknown>): Organization {
  return {
    categories: (row.categories as string[] | null) ?? [],
    companySize: (row.company_size as string) || null,
    createdAt: row.created_at as string,
    description: (row.description as string) || null,
    id: row.id as string,
    industry: (row.industry as string) || null,
    isBuyer: Boolean(row.is_buyer),
    isPublic: Boolean(row.is_public),
    isSupplier: Boolean(row.is_supplier),
    location: (row.location as string) || null,
    name: row.name as string,
    operatingRegions: (row.operating_regions as string[] | null) ?? [],
    productsServices: (row.products_services as string) || null,
    publicContactEmail: (row.public_contact_email as string) || null,
    updatedAt: row.updated_at as string,
    website: (row.website as string) || null,
  };
}

function rowToMember(row: Record<string, unknown>): OrganizationMember {
  return {
    createdAt: row.created_at as string,
    id: row.id as string,
    memberId: row.member_id as string,
    memberType: row.member_type as OrganizationMemberType,
    organizationId: row.organization_id as string,
    role: row.role as OrganizationRole,
  };
}

// Pure, DB-free predicates, matching the convention in response-actions.ts:
// the authorization rules are unit-testable without a live database.

const MANAGING_ROLES: OrganizationRole[] = ["owner", "admin"];

export function canManageOrganization(role: OrganizationRole | null): boolean {
  return role !== null && MANAGING_ROLES.includes(role);
}

export function validateCapabilities(
  isBuyer: boolean,
  isSupplier: boolean
): { valid: true } | { valid: false; reason: string } {
  if (!(isBuyer || isSupplier)) {
    return {
      reason: "Choose at least one capability: buyer, supplier, or both.",
      valid: false,
    };
  }
  return { valid: true };
}

// A seeker/employer/recruiter session all map to a member. The reserved
// 'vendor' role identifies a vendor_accounts row rather than a person, so it
// is not a membership subject; no login path issues it today either.
export function resolveOrganizationMember(
  session: Session | null
): OrganizationMemberRef | null {
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!(id && role)) {
    return null;
  }
  if (role === "employer" || role === "recruiter" || role === "seeker") {
    return { memberId: id, memberType: role };
  }
  return null;
}

// The single authorization primitive: every organization-scoped read and
// write resolves the caller's role through this first. Returns null when the
// caller is not a member, so possessing an organization id grants nothing.
export async function getMemberRole(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<OrganizationRole | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("member_id", member.memberId)
    .eq("member_type", member.memberType)
    .maybeSingle();
  return data ? (data.role as OrganizationRole) : null;
}

export async function createOrganization(
  member: OrganizationMemberRef,
  input: OrganizationCreateInput
): Promise<Organization> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Organization name is required.");
  }
  const capabilities = validateCapabilities(input.isBuyer, input.isSupplier);
  if (!capabilities.valid) {
    throw new Error(capabilities.reason);
  }

  // One transaction in Postgres: an organization without its owner row would
  // be editable by nobody. See create_organization_with_owner in
  // supabase/migrations/20261108_organization_identity.sql.
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("create_organization_with_owner", {
    p_company_size: input.companySize,
    p_description: input.description,
    p_industry: input.industry,
    p_is_buyer: input.isBuyer,
    p_is_supplier: input.isSupplier,
    p_location: input.location,
    p_member_id: member.memberId,
    p_member_type: member.memberType,
    p_name: name,
    p_website: input.website,
  });

  if (error) {
    throw toError(error, "Failed to create organization.");
  }
  // A function returning a composite type comes back as the row itself, but
  // PostgREST wraps it in an array in some versions - accept either.
  const payload: unknown = data;
  const row = (Array.isArray(payload) ? payload[0] : payload) as
    | Record<string, unknown>
    | null
    | undefined;
  if (!row) {
    throw new Error("Failed to create organization.");
  }
  return rowToOrganization(row);
}

export async function listOrganizationsForMember(
  member: OrganizationMemberRef
): Promise<OrganizationWithRole[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(*)")
    .eq("member_id", member.memberId)
    .eq("member_type", member.memberType)
    .order("created_at", { ascending: true });

  if (error) {
    throw toError(error, "Failed to load organizations.");
  }

  return (data ?? []).flatMap((row) => {
    // An embedded to-one relation is a single object at runtime, but the
    // generated types model every embed as an array - accept either.
    const embedded: unknown = row.organizations;
    const org = (Array.isArray(embedded) ? embedded[0] : embedded) as
      | Record<string, unknown>
      | null
      | undefined;
    if (!org) {
      return [];
    }
    return [{ ...rowToOrganization(org), role: row.role as OrganizationRole }];
  });
}

export interface OrganizationAttention {
  openInvitations: number;
  pendingConnections: number;
  pendingQuotations: number;
}

// The minimum useful in-app notification surface: counts, not a new
// messaging system. Reuses the three tables that already carry this state
// (organization_connections, procurement_invitations, procurement_responses)
// instead of adding a notifications table. Not membership-checked on its
// own - callers only ever have an organizationId here because
// listOrganizationsForMember already proved membership for it, same trust
// boundary as the page that renders this.
export async function getOrganizationAttention(
  organizationId: string,
  isBuyer: boolean,
  isSupplier: boolean
): Promise<OrganizationAttention> {
  const supabase = getAdminClient();

  const [connections, invitations, openRequests] = await Promise.all([
    supabase
      .from("organization_connections")
      .select("id", { count: "exact", head: true })
      .eq("recipient_org_id", organizationId)
      .eq("status", "pending"),
    isSupplier
      ? supabase
          .from("procurement_invitations")
          .select("id", { count: "exact", head: true })
          .eq("supplier_org_id", organizationId)
          .eq("status", "invited")
      : Promise.resolve({ count: 0 }),
    isBuyer
      ? supabase
          .from("procurement_requests")
          .select("id")
          .eq("buyer_org_id", organizationId)
          .in("status", ["published", "closed_for_responses", "bids_opened"])
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  let pendingQuotations = 0;
  const openRequestIds = (
    ("data" in openRequests ? openRequests.data : []) ?? []
  ).map((r) => r.id);
  if (openRequestIds.length > 0) {
    const { count } = await supabase
      .from("procurement_responses")
      .select("id", { count: "exact", head: true })
      .in("request_id", openRequestIds)
      .eq("is_withdrawn", false);
    pendingQuotations = count ?? 0;
  }

  return {
    openInvitations: invitations.count ?? 0,
    pendingConnections: connections.count ?? 0,
    pendingQuotations,
  };
}

// Membership is resolved inside this operation; callers cannot supply arbitrary
// organization IDs. No shared cache contains these private counts.
export async function listOrganizationsWithAttention(
  member: OrganizationMemberRef
) {
  const organizations = await listOrganizationsForMember(member);
  const client = getAdminClient();
  const attention = new Map(
    organizations.map((org) => [
      org.id,
      {
        openInvitations: 0,
        pendingConnections: 0,
        pendingQuotations: 0,
      },
    ])
  );
  for (let start = 0; start < organizations.length; start += 100) {
    const group = organizations.slice(start, start + 100);
    const ids = group.map((org) => org.id);
    const suppliers = group
      .filter((org) => org.isSupplier)
      .map((org) => org.id);
    const buyers = group.filter((org) => org.isBuyer).map((org) => org.id);
    // Page every relation explicitly so API row caps cannot undercount.
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("organization_connections")
        .select("id,recipient_org_id")
        .in("recipient_org_id", ids)
        .eq("status", "pending")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      for (const row of data ?? []) {
        const counts = attention.get(row.recipient_org_id);
        if (counts) counts.pendingConnections += 1;
      }
      if (!data || data.length < 1000) break;
    }
    if (suppliers.length) {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client
          .from("procurement_invitations")
          .select("id,supplier_org_id")
          .in("supplier_org_id", suppliers)
          .eq("status", "invited")
          .order("id")
          .range(offset, offset + 999);
        if (error) throw error;
        for (const row of data ?? []) {
          const counts = attention.get(row.supplier_org_id);
          if (counts) counts.openInvitations += 1;
        }
        if (!data || data.length < 1000) break;
      }
    }
    const requestOwners = new Map<string, string>();
    if (buyers.length) {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client
          .from("procurement_requests")
          .select("id,buyer_org_id")
          .in("buyer_org_id", buyers)
          .in("status", ["published", "closed_for_responses", "bids_opened"])
          .order("id")
          .range(offset, offset + 999);
        if (error) throw error;
        for (const row of data ?? [])
          requestOwners.set(row.id, row.buyer_org_id);
        if (!data || data.length < 1000) break;
      }
    }
    const requestIds = [...requestOwners.keys()];
    for (
      let requestStart = 0;
      requestStart < requestIds.length;
      requestStart += 100
    ) {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client
          .from("procurement_responses")
          .select("id,request_id")
          .in("request_id", requestIds.slice(requestStart, requestStart + 100))
          .eq("is_withdrawn", false)
          .order("id")
          .range(offset, offset + 999);
        if (error) throw error;
        for (const row of data ?? []) {
          const owner = requestOwners.get(row.request_id);
          const counts = owner ? attention.get(owner) : undefined;
          if (counts) counts.pendingQuotations += 1;
        }
        if (!data || data.length < 1000) break;
      }
    }
  }
  return organizations.map((org) => ({
    ...org,
    attention: attention.get(org.id) ?? {
      openInvitations: 0,
      pendingConnections: 0,
      pendingQuotations: 0,
    },
  }));
}

// Membership-scoped read: a non-member gets null rather than the record,
// so an organization id is not itself a capability.
export async function getOrganizationForMember(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<OrganizationWithRole | null> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    return null;
  }

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();
  return data ? { ...rowToOrganization(data), role } : null;
}

export async function updateOrganizationProfile(
  member: OrganizationMemberRef,
  organizationId: string,
  input: OrganizationProfileInput
): Promise<Organization> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new Error("Organization not found.");
  }
  if (!canManageOrganization(role)) {
    throw new Error(
      "Only an owner or admin can update this organization's profile."
    );
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Organization name is required.");
  }
  const capabilities = validateCapabilities(input.isBuyer, input.isSupplier);
  if (!capabilities.valid) {
    throw new Error(capabilities.reason);
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      categories: input.categories,
      company_size: input.companySize,
      description: input.description,
      industry: input.industry,
      is_buyer: input.isBuyer,
      is_public: input.isPublic,
      is_supplier: input.isSupplier,
      location: input.location,
      name,
      operating_regions: input.operatingRegions,
      products_services: input.productsServices,
      public_contact_email: input.publicContactEmail,
      updated_at: new Date().toISOString(),
      website: input.website,
    })
    .eq("id", organizationId)
    .select("*")
    .single();

  if (error) {
    throw toError(error, "Failed to update organization.");
  }
  return rowToOrganization(data);
}

export async function listOrganizationMembers(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<OrganizationMember[]> {
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new Error("Organization not found.");
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw toError(error, "Failed to load members.");
  }
  return (data ?? []).map(rowToMember);
}
