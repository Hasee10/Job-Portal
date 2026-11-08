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
  companySize: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  industry: string | null;
  isBuyer: boolean;
  isSupplier: boolean;
  location: string | null;
  name: string;
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
  companySize: string | null;
  description: string | null;
  industry: string | null;
  isBuyer: boolean;
  isSupplier: boolean;
  location: string | null;
  name: string;
  website: string | null;
}

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
    companySize: (row.company_size as string) || null,
    createdAt: row.created_at as string,
    description: (row.description as string) || null,
    id: row.id as string,
    industry: (row.industry as string) || null,
    isBuyer: Boolean(row.is_buyer),
    isSupplier: Boolean(row.is_supplier),
    location: (row.location as string) || null,
    name: row.name as string,
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
  input: OrganizationProfileInput
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
      company_size: input.companySize,
      description: input.description,
      industry: input.industry,
      is_buyer: input.isBuyer,
      is_supplier: input.isSupplier,
      location: input.location,
      name,
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
