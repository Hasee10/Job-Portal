import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  MESSAGE_MAX_LENGTH,
  MESSAGES_PAGE_SIZE,
  type MessagePage,
  type OrganizationMessage,
} from "./message-types";
import {
  getMemberRole,
  type OrganizationMemberRef,
} from "./organization-actions";

// Messaging between two businesses on one accepted buyer-supplier connection.
//
// The connection is the conversation's authority. Every read and write below
// re-derives, from the database and never from the caller: that the person is
// an active member of the organization they claim to act for, that the
// connection exists and is accepted, and that the organization is one of its
// two parties. The server-side client holds service_role and bypasses RLS, so
// these checks are the authorization - not a convenience on top of it.

export interface ConversationAccess {
  connectionId: string;
  counterpartyOrgId: string;
  organizationId: string;
}

export class MessageError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "MessageError";
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

// Pure and DB-free, matching the convention in response-actions.ts, so the
// one rule a caller is most likely to get wrong is unit-testable.
export function validateMessageBody(
  raw: string
): { body: string; valid: true } | { reason: string; valid: false } {
  const body = raw.trim();
  if (!body) {
    return { reason: "A message cannot be empty.", valid: false };
  }
  if (body.length > MESSAGE_MAX_LENGTH) {
    return {
      reason: `A message cannot be longer than ${MESSAGE_MAX_LENGTH} characters.`,
      valid: false,
    };
  }
  return { body, valid: true };
}

// The single authorization primitive for messaging. A caller that has not
// been through this has not been authorized.
//
// organizationId is required rather than inferred: a person can belong to
// both parties of a connection, and guessing which one they are speaking for
// would attribute their message to the wrong business.
export async function resolveConversation(
  member: OrganizationMemberRef,
  organizationId: string,
  connectionId: string
): Promise<ConversationAccess> {
  // 1. Active membership of the organization being acted for. Checked first,
  //    so someone who is not a member learns nothing about the connection.
  const role = await getMemberRole(member, organizationId);
  if (!role) {
    throw new MessageError("Conversation not found.", "not_found");
  }

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organization_connections")
    .select("id, status, buyer_org_id, supplier_org_id")
    .eq("id", connectionId)
    .maybeSingle();

  // 2. The connection exists. Same error as every other failure below, so a
  //    caller cannot probe which connection ids are real.
  if (!data) {
    throw new MessageError("Conversation not found.", "not_found");
  }

  const buyerOrgId = data.buyer_org_id as string;
  const supplierOrgId = data.supplier_org_id as string;

  // 3. The organization is actually a party to this connection. Without this,
  //    membership of any organization plus a connection id would be enough.
  if (organizationId !== buyerOrgId && organizationId !== supplierOrgId) {
    throw new MessageError("Conversation not found.", "not_found");
  }

  // 4. Only an accepted relationship carries a conversation. A pending
  //    request has not been agreed to and a rejected one has been refused;
  //    neither may exchange messages.
  if (data.status !== "accepted") {
    throw new MessageError(
      "You can only message a business once the connection has been accepted.",
      "not_accepted"
    );
  }

  return {
    connectionId,
    counterpartyOrgId:
      organizationId === buyerOrgId ? supplierOrgId : buyerOrgId,
    organizationId,
  };
}

export async function listMessages(
  member: OrganizationMemberRef,
  organizationId: string,
  connectionId: string,
  page = 1
): Promise<MessagePage> {
  const access = await resolveConversation(
    member,
    organizationId,
    connectionId
  );

  const current = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (current - 1) * MESSAGES_PAGE_SIZE;

  const supabase = getAdminClient();
  const { data, count, error } = await supabase
    .from("organization_messages")
    .select("id, body, created_at, sender_org_id", { count: "exact" })
    .eq("connection_id", access.connectionId)
    // created_at then id: two messages can share a timestamp, and an
    // unstable sort makes rows repeat or vanish between pages.
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + MESSAGES_PAGE_SIZE - 1);

  if (error) {
    throw new MessageError(
      error.message || "Failed to load messages.",
      "query_failed"
    );
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const names = await loadOrganizationNames([
    access.organizationId,
    access.counterpartyOrgId,
  ]);

  const total = count ?? 0;
  return {
    messages: rows.map((row) => {
      const senderOrgId = row.sender_org_id as string;
      return {
        body: row.body as string,
        createdAt: row.created_at as string,
        id: row.id as string,
        isOwn: senderOrgId === access.organizationId,
        senderOrgId,
        senderOrgName: names.get(senderOrgId) ?? null,
      };
    }),
    page: current,
    pageCount: Math.max(1, Math.ceil(total / MESSAGES_PAGE_SIZE)),
    total,
  };
}

export async function sendMessage(
  member: OrganizationMemberRef,
  organizationId: string,
  connectionId: string,
  rawBody: string
): Promise<OrganizationMessage> {
  // Authorize before validating, so an unauthorized caller gets the same
  // "not found" whether or not their message was well formed.
  const access = await resolveConversation(
    member,
    organizationId,
    connectionId
  );

  const validated = validateMessageBody(rawBody);
  if (!validated.valid) {
    throw new MessageError(validated.reason, "invalid_body");
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("organization_messages")
    .insert({
      body: validated.body,
      connection_id: access.connectionId,
      // Taken from the resolved access and the session, never from the
      // request body: a caller cannot post as another organization or member.
      sender_member_id: member.memberId,
      sender_member_type: member.memberType,
      sender_org_id: access.organizationId,
    })
    .select("id, body, created_at, sender_org_id")
    .single();

  if (error) {
    // Deliberately not including the body in the message: it would end up in
    // application logs.
    throw new MessageError("Failed to send the message.", "insert_failed");
  }

  const names = await loadOrganizationNames([access.organizationId]);
  return {
    body: data.body as string,
    createdAt: data.created_at as string,
    id: data.id as string,
    isOwn: true,
    senderOrgId: data.sender_org_id as string,
    senderOrgName: names.get(data.sender_org_id as string) ?? null,
  };
}

async function loadOrganizationNames(
  ids: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) {
    return new Map();
  }
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", unique);

  return new Map(
    ((data ?? []) as Record<string, unknown>[]).map((row) => [
      row.id as string,
      row.name as string,
    ])
  );
}
