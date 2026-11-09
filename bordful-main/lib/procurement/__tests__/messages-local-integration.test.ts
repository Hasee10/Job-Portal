// Real messaging workflow against the local stack: organizations, memberships
// and connections in PostgreSQL, served by standalone PostgREST, exercised
// through the actual server actions in message-actions.ts. Nothing is mocked.
//
// What this does NOT cover: the Next.js HTTP routes and a browser session.
// These call the same functions the routes call, one layer below them.
//
// Connections are inserted directly as fixtures rather than driven through
// the M3A request/respond actions - that flow was verified when M3A landed,
// and re-driving it here would test M3A rather than messaging.
//
// Skipped unless SUPABASE_URL points at loopback, which also makes it
// impossible to run against the hosted project. Everything created is removed
// in afterAll, including when an expectation fails.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listMessages, sendMessage } from "../message-actions";
import { MESSAGE_MAX_LENGTH, type MessagePage } from "../message-types";
import type { OrganizationMemberRef } from "../organization-actions";
import { localTarget } from "./local-integration-env";

const { canRun, serviceKey, url } = localTarget();
const describeLocal = canRun ? describe : describe.skip;

const RUN = `zmsgtest-${Date.now().toString(36)}`;

// Hoisted so each assertion reuses one compiled pattern.
const NEEDS_ACCEPTED = /accepted/i;
const NOT_FOUND = /not found/i;
const EMPTY_BODY = /empty/i;
const TOO_LONG = /longer than/i;

const BULK_COUNT = 55;

function member(): OrganizationMemberRef {
  return { memberId: crypto.randomUUID(), memberType: "employer" };
}

describeLocal("local integration: business messaging", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const buyerMember = member();
  const supplierMember = member();
  const outsiderMember = member();
  const removedMember = member();

  let buyerOrg = "";
  let supplierOrg = "";
  let outsiderOrg = "";
  let acceptedId = "";
  let pendingId = "";
  let rejectedId = "";
  let reverseId = "";

  async function createOrg(name: string, owner: OrganizationMemberRef) {
    const { data, error } = await admin.rpc("create_organization_with_owner", {
      p_is_buyer: true,
      p_is_supplier: true,
      p_member_id: owner.memberId,
      p_member_type: owner.memberType,
      p_name: name,
    });
    if (error) {
      throw new Error(`createOrg(${name}): ${error.message}`);
    }
    const row = (Array.isArray(data) ? data[0] : data) as { id: string };
    return row.id;
  }

  async function connect(
    buyer: string,
    supplier: string,
    status: "accepted" | "pending" | "rejected"
  ) {
    const { data, error } = await admin
      .from("organization_connections")
      .insert({
        buyer_org_id: buyer,
        recipient_org_id: supplier,
        requested_by_id: buyerMember.memberId,
        requested_by_type: "employer",
        requester_org_id: buyer,
        status,
        supplier_org_id: supplier,
      })
      .select("id")
      .single();
    if (error) {
      throw new Error(`connect(${status}): ${error.message}`);
    }
    return data.id as string;
  }

  beforeAll(async () => {
    buyerOrg = await createOrg(`${RUN} Buyer`, buyerMember);
    supplierOrg = await createOrg(`${RUN} Supplier`, supplierMember);
    outsiderOrg = await createOrg(`${RUN} Outsider`, outsiderMember);

    // A second member of the buyer, removed partway through the run.
    await admin.from("organization_members").insert({
      member_id: removedMember.memberId,
      member_type: removedMember.memberType,
      organization_id: buyerOrg,
      role: "member",
    });

    acceptedId = await connect(buyerOrg, supplierOrg, "accepted");
    pendingId = await connect(buyerOrg, outsiderOrg, "pending");
    rejectedId = await connect(outsiderOrg, supplierOrg, "rejected");
    // The same two businesses trading the other way: supplier buys from buyer.
    reverseId = await connect(supplierOrg, buyerOrg, "accepted");
  });

  afterAll(async () => {
    // Messages before connections, and members before organizations, because
    // of the foreign keys. Within each step the deletes are independent, so
    // they go together rather than one id at a time.
    const connectionIds = [acceptedId, pendingId, rejectedId, reverseId].filter(
      Boolean
    );
    const orgIds = [buyerOrg, supplierOrg, outsiderOrg].filter(Boolean);

    await admin
      .from("organization_messages")
      .delete()
      .in("connection_id", connectionIds);
    await admin
      .from("organization_connections")
      .delete()
      .in("id", connectionIds);
    await admin
      .from("organization_members")
      .delete()
      .in("organization_id", orgIds);
    await admin.from("organizations").delete().in("id", orgIds);
    // Thrown rather than asserted: an expectation in afterAll is reported
    // against whichever test ran last, which would point at the wrong place.
    const { count } = await admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .like("name", `${RUN}%`);
    if ((count ?? 0) !== 0) {
      throw new Error(`cleanup left ${count} organizations behind`);
    }
  });

  it("lets an authorized member of each side send and read", async () => {
    await sendMessage(
      buyerMember,
      buyerOrg,
      acceptedId,
      "Can you quote 200 units?"
    );
    await sendMessage(
      supplierMember,
      supplierOrg,
      acceptedId,
      "Yes - sending today."
    );

    const asBuyer = await listMessages(buyerMember, buyerOrg, acceptedId);
    const asSupplier = await listMessages(
      supplierMember,
      supplierOrg,
      acceptedId
    );

    // Both organizations see the same conversation.
    expect(asBuyer.total).toBe(2);
    expect(asSupplier.total).toBe(2);
    expect(asBuyer.messages.map((m) => m.body)).toEqual([
      "Can you quote 200 units?",
      "Yes - sending today.",
    ]);
    // ...and each sees authorship from its own side.
    expect(asBuyer.messages[0].isOwn).toBe(true);
    expect(asSupplier.messages[0].isOwn).toBe(false);
    expect(asBuyer.messages[0].senderOrgName).toContain("Buyer");
  });

  it("keeps opposite-direction relationships in separate conversations", async () => {
    // The reverse connection is between the same two businesses. Its thread
    // must not pick up the messages sent on the first one.
    await sendMessage(
      supplierMember,
      supplierOrg,
      reverseId,
      "Separate thread."
    );
    const reverse = await listMessages(supplierMember, supplierOrg, reverseId);
    expect(reverse.total).toBe(1);
    expect(reverse.messages[0].body).toBe("Separate thread.");

    const forward = await listMessages(buyerMember, buyerOrg, acceptedId);
    expect(forward.messages.map((m) => m.body)).not.toContain(
      "Separate thread."
    );
  });

  it("refuses a pending connection", async () => {
    await expect(
      sendMessage(buyerMember, buyerOrg, pendingId, "too early")
    ).rejects.toThrow(NEEDS_ACCEPTED);
    await expect(
      listMessages(buyerMember, buyerOrg, pendingId)
    ).rejects.toThrow(NEEDS_ACCEPTED);
  });

  it("refuses a rejected connection", async () => {
    await expect(
      sendMessage(supplierMember, supplierOrg, rejectedId, "nope")
    ).rejects.toThrow(NEEDS_ACCEPTED);
  });

  it("hides the conversation from a third organization", async () => {
    // The outsider is a real member of a real organization, and the
    // connection id is real - only the relationship is missing.
    await expect(
      listMessages(outsiderMember, outsiderOrg, acceptedId)
    ).rejects.toThrow(NOT_FOUND);
    await expect(
      sendMessage(outsiderMember, outsiderOrg, acceptedId, "let me in")
    ).rejects.toThrow(NOT_FOUND);

    // Nor by claiming to act for an organization they do not belong to.
    await expect(
      listMessages(outsiderMember, buyerOrg, acceptedId)
    ).rejects.toThrow(NOT_FOUND);
  });

  it("cuts off a member once their membership is removed", async () => {
    const before = await listMessages(removedMember, buyerOrg, acceptedId);
    expect(before.total).toBeGreaterThan(0);

    await admin
      .from("organization_members")
      .delete()
      .eq("organization_id", buyerOrg)
      .eq("member_id", removedMember.memberId);

    await expect(
      listMessages(removedMember, buyerOrg, acceptedId)
    ).rejects.toThrow(NOT_FOUND);
    await expect(
      sendMessage(removedMember, buyerOrg, acceptedId, "still here?")
    ).rejects.toThrow(NOT_FOUND);
  });

  it("rejects empty, whitespace-only and oversized messages", async () => {
    await expect(
      sendMessage(buyerMember, buyerOrg, acceptedId, "   ")
    ).rejects.toThrow(EMPTY_BODY);
    await expect(
      sendMessage(
        buyerMember,
        buyerOrg,
        acceptedId,
        "x".repeat(MESSAGE_MAX_LENGTH + 1)
      )
    ).rejects.toThrow(TOO_LONG);
  });

  it("enforces the body length in the database, not only in the action", async () => {
    // Inserted straight through PostgREST, bypassing sendMessage, so this
    // exercises the CHECK constraint rather than the validation in front of
    // it. A future caller that forgets to validate still cannot write junk.
    const oversized = await admin.from("organization_messages").insert({
      body: "x".repeat(MESSAGE_MAX_LENGTH + 1),
      connection_id: acceptedId,
      sender_member_id: buyerMember.memberId,
      sender_member_type: buyerMember.memberType,
      sender_org_id: buyerOrg,
    });
    expect(oversized.error).not.toBeNull();

    const blank = await admin.from("organization_messages").insert({
      body: "   ",
      connection_id: acceptedId,
      sender_member_id: buyerMember.memberId,
      sender_member_type: buyerMember.memberType,
      sender_org_id: buyerOrg,
    });
    expect(blank.error).not.toBeNull();
  });

  it("orders chronologically and paginates without gaps or repeats", async () => {
    // Enough to span more than one page of 50. Inserted in one statement
    // with explicit, strictly increasing timestamps: sending them one by one
    // would rely on wall-clock resolution to separate them, and two rows
    // sharing a created_at is exactly the tie this test needs to be sure
    // about rather than hope for.
    const base = Date.now();
    const bulk = Array.from({ length: BULK_COUNT }, (_, i) => ({
      body: `bulk ${String(i).padStart(3, "0")}`,
      connection_id: acceptedId,
      created_at: new Date(base + i * 1000).toISOString(),
      sender_member_id: buyerMember.memberId,
      sender_member_type: buyerMember.memberType,
      sender_org_id: buyerOrg,
    }));
    const inserted = await admin.from("organization_messages").insert(bulk);
    expect(inserted.error).toBeNull();

    const page1: MessagePage = await listMessages(
      buyerMember,
      buyerOrg,
      acceptedId,
      1
    );
    const page2 = await listMessages(buyerMember, buyerOrg, acceptedId, 2);

    expect(page1.messages).toHaveLength(50);
    expect(page1.pageCount).toBeGreaterThan(1);

    const ids = [...page1.messages, ...page2.messages].map((m) => m.id);
    // No row appears on both pages, and together they cover the total.
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(page1.total);

    const times = [...page1.messages, ...page2.messages].map((m) =>
      new Date(m.createdAt).getTime()
    );
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });
});
