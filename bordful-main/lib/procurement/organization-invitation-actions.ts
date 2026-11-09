import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  canManageOrganization,
  getMemberRole,
  type OrganizationMemberRef,
  type OrganizationMemberType,
  type OrganizationRole,
} from "./organization-actions";

// Joining an organization. Separate from organization-actions.ts because the
// trust model is different: everything there is done by someone who is
// already a member, while an invitation is the one path by which a stranger
// becomes one.
//
// Invitations are capability tokens, not email addresses. This deployment
// does not verify email: createEmployer() in lib/auth/employers.ts issues an
// account for any address with no confirmation step, and employers carries
// no verified flag. "Whoever signs in with the invited address" would
// therefore let anyone register that address and walk into another company's
// organization. The token is the authority; the address is a label.
//
// Only the SHA-256 hash is stored, matching the existing password reset flow,
// so a leaked database row cannot be redeemed.

export type InvitationStatus = "pending" | "accepted" | "revoked" | "declined";

// 'owner' is absent on purpose: an invitation is accepted by whoever holds
// the token, which is not how a business should hand over control. Ownership
// changes go through updateMemberRole, which requires an existing owner.
export type InvitableRole = Extract<OrganizationRole, "admin" | "member">;

export interface OrganizationInvitation {
  createdAt: string;
  expiresAt: string;
  id: string;
  invitedEmail: string | null;
  isExpired: boolean;
  organizationId: string;
  role: InvitableRole;
  status: InvitationStatus;
}

export interface CreatedInvitation {
  invitation: OrganizationInvitation;
  // Returned exactly once, never stored and never readable again. The
  // inviter passes it to their colleague over a channel they already trust.
  token: string;
}

export interface OrganizationMemberDetail {
  createdAt: string;
  id: string;
  memberId: string;
  memberType: OrganizationMemberType;
  role: OrganizationRole;
}

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

export class InvitationError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "InvitationError";
    this.code = code;
  }
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(url && key)) {
    throw new InvitationError(
      "Database is not configured on this deployment.",
      "db_unavailable"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function rowToInvitation(row: Record<string, unknown>): OrganizationInvitation {
  const expiresAt = row.expires_at as string;
  return {
    createdAt: row.created_at as string,
    expiresAt,
    id: row.id as string,
    invitedEmail: (row.invited_email as string) || null,
    isExpired: Date.parse(expiresAt) <= Date.now(),
    organizationId: row.organization_id as string,
    role: row.role as InvitableRole,
    status: row.status as InvitationStatus,
  };
}

// Pure so the permission rules are testable without a database, matching the
// convention in organization-actions.ts.

export function canInviteRole(
  actorRole: OrganizationRole | null,
  target: string
): target is InvitableRole {
  if (!canManageOrganization(actorRole)) {
    return false;
  }
  return target === "admin" || target === "member";
}

// Who may remove whom. An admin manages ordinary members; it takes an owner
// to remove another manager, so an admin cannot unseat the owner who
// appointed them.
export function canRemoveMember(
  actorRole: OrganizationRole | null,
  targetRole: OrganizationRole
): boolean {
  if (actorRole === "owner") {
    return true;
  }
  if (actorRole === "admin") {
    return targetRole === "member";
  }
  return false;
}

// Token comparison is by constant time even though the stored value is a
// hash: the lookup is by equality in the database, and this guards the
// follow-up check against leaking position through timing.
function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

async function requireManager(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<OrganizationRole> {
  const role = await getMemberRole(member, organizationId);
  // Same message whether the organization does not exist or the caller is
  // not in it: knowing an id must not confirm that a business exists.
  if (!role) {
    throw new InvitationError("Organization not found.", "not_found");
  }
  if (!canManageOrganization(role)) {
    throw new InvitationError(
      "Only an owner or admin can manage this organization's members.",
      "forbidden"
    );
  }
  return role;
}

export async function createInvitation(
  member: OrganizationMemberRef,
  organizationId: string,
  input: { invitedEmail?: string | null; role: string }
): Promise<CreatedInvitation> {
  const actorRole = await requireManager(member, organizationId);
  if (!canInviteRole(actorRole, input.role)) {
    throw new InvitationError(
      "An invitation can grant the admin or member role only.",
      "invalid_role"
    );
  }

  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organization_invitations")
    .insert({
      expires_at: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
      invited_by_id: member.memberId,
      invited_by_type: member.memberType,
      invited_email: input.invitedEmail?.trim() || null,
      organization_id: organizationId,
      role: input.role,
      token_hash: hashToken(token),
    })
    .select("*")
    .single();

  if (error) {
    throw new InvitationError(
      error.message || "Failed to create the invitation.",
      "insert_failed"
    );
  }
  return { invitation: rowToInvitation(data), token };
}

export async function listInvitations(
  member: OrganizationMemberRef,
  organizationId: string
): Promise<OrganizationInvitation[]> {
  await requireManager(member, organizationId);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organization_invitations")
    // token_hash is never selected: it does not need to leave the database,
    // and a hash in a response body is one step from an offline attack on a
    // short token.
    .select(
      "id, organization_id, invited_email, role, status, expires_at, created_at"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new InvitationError(
      error.message || "Failed to load invitations.",
      "query_failed"
    );
  }
  return (data ?? []).map((row) =>
    rowToInvitation(row as Record<string, unknown>)
  );
}

export async function revokeInvitation(
  member: OrganizationMemberRef,
  organizationId: string,
  invitationId: string
): Promise<OrganizationInvitation> {
  await requireManager(member, organizationId);

  const supabase = getAdminClient();
  // organization_id is part of the predicate, so a manager of one business
  // cannot revoke another's invitation by its id.
  const { data, error } = await supabase
    .from("organization_invitations")
    .update({ responded_at: new Date().toISOString(), status: "revoked" })
    .eq("id", invitationId)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new InvitationError(
      error.message || "Failed to revoke the invitation.",
      "update_failed"
    );
  }
  if (!data) {
    throw new InvitationError(
      "That invitation is no longer pending.",
      "not_pending"
    );
  }
  return rowToInvitation(data);
}

async function claimPendingInvitation(
  token: string,
  nextStatus: "accepted" | "declined",
  member: OrganizationMemberRef
): Promise<Record<string, unknown>> {
  const supabase = getAdminClient();
  const tokenHash = hashToken(token);

  // Claim and read in one statement. Checking first and updating afterwards
  // would let the same token be redeemed twice from two concurrent requests;
  // the status predicate here means the second update matches no row.
  // expires_at is part of the predicate too, so an expired token cannot be
  // claimed however long it has been held.
  const { data, error } = await supabase
    .from("organization_invitations")
    .update({
      accepted_by_id: member.memberId,
      accepted_by_type: member.memberType,
      responded_at: new Date().toISOString(),
      status: nextStatus,
    })
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();

  if (error) {
    throw new InvitationError(
      error.message || "Failed to redeem the invitation.",
      "update_failed"
    );
  }
  if (!(data && tokensMatch(hashToken(token), data.token_hash as string))) {
    // One message for every failure: wrong token, already used, revoked and
    // expired are indistinguishable to the caller, so this cannot be used to
    // probe which tokens exist.
    throw new InvitationError(
      "That invitation is not valid. It may have expired or already been used.",
      "invalid_token"
    );
  }
  return data;
}

export async function acceptInvitation(
  member: OrganizationMemberRef,
  token: string
): Promise<{ organizationId: string; role: OrganizationRole }> {
  const invitation = await claimPendingInvitation(token, "accepted", member);
  const organizationId = invitation.organization_id as string;
  const role = invitation.role as OrganizationRole;

  const supabase = getAdminClient();
  const { error } = await supabase.from("organization_members").insert({
    member_id: member.memberId,
    member_type: member.memberType,
    organization_id: organizationId,
    role,
  });

  // 23505 is the unique (organization_id, member_type, member_id) index:
  // already a member. The invitation is spent either way, and the caller
  // ends up where they wanted to be, so this is not an error.
  if (error && error.code !== "23505") {
    throw new InvitationError(
      error.message || "Failed to join the organization.",
      "insert_failed"
    );
  }
  return { organizationId, role };
}

export async function declineInvitation(
  member: OrganizationMemberRef,
  token: string
): Promise<{ organizationId: string }> {
  const invitation = await claimPendingInvitation(token, "declined", member);
  return { organizationId: invitation.organization_id as string };
}

async function countOwners(organizationId: string): Promise<number> {
  const supabase = getAdminClient();
  const { count } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", "owner");
  return count ?? 0;
}

async function findMember(
  organizationId: string,
  target: OrganizationMemberRef
): Promise<OrganizationMemberDetail | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organization_members")
    .select("id, member_id, member_type, role, created_at")
    .eq("organization_id", organizationId)
    .eq("member_id", target.memberId)
    .eq("member_type", target.memberType)
    .maybeSingle();

  if (!data) {
    return null;
  }
  return {
    createdAt: data.created_at as string,
    id: data.id as string,
    memberId: data.member_id as string,
    memberType: data.member_type as OrganizationMemberType,
    role: data.role as OrganizationRole,
  };
}

export async function removeMember(
  actor: OrganizationMemberRef,
  organizationId: string,
  target: OrganizationMemberRef
): Promise<void> {
  const actorRole = await requireManager(actor, organizationId);

  const targetMember = await findMember(organizationId, target);
  if (!targetMember) {
    throw new InvitationError("That person is not a member.", "not_found");
  }
  if (!canRemoveMember(actorRole, targetMember.role)) {
    throw new InvitationError(
      "An admin can remove members only. Ask an owner to remove another manager.",
      "forbidden"
    );
  }
  // An organization with no owner can never be administered again, and
  // nothing else in the schema prevents this.
  if (
    targetMember.role === "owner" &&
    (await countOwners(organizationId)) < 2
  ) {
    throw new InvitationError(
      "This is the last owner. Make someone else an owner first.",
      "last_owner"
    );
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("member_id", target.memberId)
    .eq("member_type", target.memberType);

  if (error) {
    throw new InvitationError(
      error.message || "Failed to remove the member.",
      "delete_failed"
    );
  }
}

export async function updateMemberRole(
  actor: OrganizationMemberRef,
  organizationId: string,
  target: OrganizationMemberRef,
  role: OrganizationRole
): Promise<OrganizationMemberDetail> {
  // Role changes are owner-only, including promotion to owner. An admin who
  // could grant roles could promote itself, which is the escalation this
  // rule exists to prevent.
  const actorRole = await getMemberRole(actor, organizationId);
  if (!actorRole) {
    throw new InvitationError("Organization not found.", "not_found");
  }
  if (actorRole !== "owner") {
    throw new InvitationError(
      "Only an owner can change a member's role.",
      "forbidden"
    );
  }

  const targetMember = await findMember(organizationId, target);
  if (!targetMember) {
    throw new InvitationError("That person is not a member.", "not_found");
  }
  if (targetMember.role === role) {
    return targetMember;
  }
  if (
    targetMember.role === "owner" &&
    (await countOwners(organizationId)) < 2
  ) {
    throw new InvitationError(
      "This is the last owner. Make someone else an owner first.",
      "last_owner"
    );
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("organization_id", organizationId)
    .eq("member_id", target.memberId)
    .eq("member_type", target.memberType)
    .select("id, member_id, member_type, role, created_at")
    .single();

  if (error) {
    throw new InvitationError(
      error.message || "Failed to update the member's role.",
      "update_failed"
    );
  }
  return {
    createdAt: data.created_at as string,
    id: data.id as string,
    memberId: data.member_id as string,
    memberType: data.member_type as OrganizationMemberType,
    role: data.role as OrganizationRole,
  };
}
