// M3A over real HTTP: invitations, membership permissions, buyer-supplier
// connections and the approved supplier network, against standalone
// PostgREST and real PostgreSQL. Nothing is mocked.
//
// Skipped unless SUPABASE_URL points at loopback, which is also the
// interlock that keeps it away from the hosted project. Every row it creates
// is removed in afterAll, and the hook fails loudly if any survives.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localTarget } from "./local-integration-env";

const { canRun, serviceKey, url } = localTarget();
const describeLocal = canRun ? describe : describe.skip;

const RUN = `ziltest-${Date.now().toString(36)}`;
const uuid = () => crypto.randomUUID();

interface Ref {
  memberId: string;
  memberType: "employer";
}

const NOT_FOUND = /not found/i;
const ONLY_OWNER_OR_ADMIN = /owner or admin/i;
const ONLY_OWNER = /only an owner/i;
const LAST_OWNER = /last owner/i;
const NOT_VALID = /not valid/i;
const ALREADY_EXISTS_DIRECTION = /already a pending or accepted/i;
const NOT_A_BUYER = /not set up as a buyer/i;
const CANNOT_CONNECT_SELF = /cannot connect to itself/i;
const INVITE_ROLE_LIMITED = /admin or member/i;
const ADMIN_REMOVES_MEMBERS_ONLY = /admin can remove members only/i;
const ALREADY_ANSWERED = /already been answered/i;

describeLocal("local HTTP integration: organization network (M3A)", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const createdOrgIds: string[] = [];

  // Three businesses and four people, so cross-organization isolation can be
  // tested rather than assumed.
  let buyerOwner: Ref;
  let supplierOwner: Ref;
  let outsider: Ref;
  let colleague: Ref;
  let buyerOrgId = "";
  let supplierOrgId = "";
  let otherOrgId = "";

  async function makeOrg(
    owner: Ref,
    label: string,
    isBuyer: boolean,
    isSupplier: boolean,
    isPublic: boolean
  ): Promise<string> {
    const { createOrganization, updateOrganizationProfile } = await import(
      "@/lib/procurement/organization-actions"
    );
    const org = await createOrganization(owner, {
      companySize: "11-50",
      description: null,
      industry: "Manufacturing",
      isBuyer,
      isSupplier,
      location: "Karachi",
      name: `${RUN} ${label}`,
      website: null,
    });
    createdOrgIds.push(org.id);
    // Discovery is opt-in, and a connection may only target a listed
    // business, so publishing is part of the fixture.
    await updateOrganizationProfile(owner, org.id, {
      categories: ["industrial-supplies"],
      companySize: "11-50",
      description: `${label} business`,
      industry: "Manufacturing",
      isBuyer,
      isPublic,
      isSupplier,
      location: "Karachi",
      name: `${RUN} ${label}`,
      operatingRegions: ["PK"],
      productsServices: "valves",
      publicContactEmail: null,
      website: null,
    });
    return org.id;
  }

  beforeAll(async () => {
    buyerOwner = { memberId: uuid(), memberType: "employer" };
    supplierOwner = { memberId: uuid(), memberType: "employer" };
    outsider = { memberId: uuid(), memberType: "employer" };
    colleague = { memberId: uuid(), memberType: "employer" };

    buyerOrgId = await makeOrg(buyerOwner, "Buyer", true, false, true);
    supplierOrgId = await makeOrg(supplierOwner, "Supplier", false, true, true);
    // Listed, and both capabilities, so direction and duplicate rules can be
    // exercised independently of the first two.
    otherOrgId = await makeOrg(outsider, "Other", true, true, true);
  });

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await admin
        .from("organization_connections")
        .delete()
        .in("requester_org_id", createdOrgIds);
      await admin
        .from("organization_invitations")
        .delete()
        .in("organization_id", createdOrgIds);
      await admin
        .from("organization_members")
        .delete()
        .in("organization_id", createdOrgIds);
      await admin.from("organizations").delete().in("id", createdOrgIds);
    }
    const { count } = await admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .ilike("name", `%${RUN}%`);
    if ((count ?? 0) !== 0) {
      throw new Error(`Cleanup failed: ${count} ${RUN} organizations remain.`);
    }
  });

  // -------------------------------------------------------------------
  // Invitations
  // -------------------------------------------------------------------

  it("lets a manager invite a colleague, who joins with the token", async () => {
    const { createInvitation, acceptInvitation, listInvitations } =
      await import("@/lib/procurement/organization-invitation-actions");
    const { listOrganizationMembers } = await import(
      "@/lib/procurement/organization-actions"
    );

    const { invitation, token } = await createInvitation(
      buyerOwner,
      buyerOrgId,
      { invitedEmail: `colleague-${RUN}@example.test`, role: "admin" }
    );
    expect(invitation.status).toBe("pending");
    expect(invitation.role).toBe("admin");
    expect(token.length).toBeGreaterThan(32);

    // The raw token must not be recoverable from any later read.
    const listed = await listInvitations(buyerOwner, buyerOrgId);
    expect(JSON.stringify(listed)).not.toContain(token);

    const joined = await acceptInvitation(colleague, token);
    expect(joined.organizationId).toBe(buyerOrgId);
    expect(joined.role).toBe("admin");

    const members = await listOrganizationMembers(buyerOwner, buyerOrgId);
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.role).sort()).toEqual(["admin", "owner"]);
  });

  it("refuses a token that has already been used", async () => {
    const { createInvitation, acceptInvitation } = await import(
      "@/lib/procurement/organization-invitation-actions"
    );
    const { token } = await createInvitation(buyerOwner, buyerOrgId, {
      role: "member",
    });
    await acceptInvitation({ memberId: uuid(), memberType: "employer" }, token);
    await expect(
      acceptInvitation({ memberId: uuid(), memberType: "employer" }, token)
    ).rejects.toThrow(NOT_VALID);
  });

  it("refuses a revoked token and an unknown one alike", async () => {
    const { createInvitation, acceptInvitation, revokeInvitation } =
      await import("@/lib/procurement/organization-invitation-actions");
    const { invitation, token } = await createInvitation(
      buyerOwner,
      buyerOrgId,
      { role: "member" }
    );
    const revoked = await revokeInvitation(
      buyerOwner,
      buyerOrgId,
      invitation.id
    );
    expect(revoked.status).toBe("revoked");

    await expect(acceptInvitation(colleague, token)).rejects.toThrow(NOT_VALID);
    await expect(
      acceptInvitation(colleague, "not-a-real-token")
    ).rejects.toThrow(NOT_VALID);
  });

  it("refuses an expired token", async () => {
    const { createInvitation, acceptInvitation } = await import(
      "@/lib/procurement/organization-invitation-actions"
    );
    const { invitation, token } = await createInvitation(
      buyerOwner,
      buyerOrgId,
      { role: "member" }
    );
    // Age it past its lifetime: expiry is enforced in the claim predicate,
    // not by a sweep job, so the row can simply be backdated.
    await admin
      .from("organization_invitations")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", invitation.id);

    await expect(acceptInvitation(colleague, token)).rejects.toThrow(NOT_VALID);
  });

  it("does not let a non-member invite anyone, or even see invitations", async () => {
    const { createInvitation, listInvitations } = await import(
      "@/lib/procurement/organization-invitation-actions"
    );
    await expect(
      createInvitation(outsider, buyerOrgId, { role: "admin" })
    ).rejects.toThrow(NOT_FOUND);
    await expect(listInvitations(outsider, buyerOrgId)).rejects.toThrow(
      NOT_FOUND
    );
  });

  it("does not let an invitation grant ownership", async () => {
    const { createInvitation } = await import(
      "@/lib/procurement/organization-invitation-actions"
    );
    await expect(
      createInvitation(buyerOwner, buyerOrgId, { role: "owner" })
    ).rejects.toThrow(INVITE_ROLE_LIMITED);
  });

  it("stops an admin promoting itself, and protects the last owner", async () => {
    const { updateMemberRole, removeMember } = await import(
      "@/lib/procurement/organization-invitation-actions"
    );
    // `colleague` is an admin of the buyer organization from the first test.
    await expect(
      updateMemberRole(colleague, buyerOrgId, colleague, "owner")
    ).rejects.toThrow(ONLY_OWNER);

    // An admin may not remove a manager either: it passes the manager check
    // and is stopped by the removal rule, so an admin cannot unseat the
    // owner who appointed them.
    await expect(
      removeMember(colleague, buyerOrgId, buyerOwner)
    ).rejects.toThrow(ADMIN_REMOVES_MEMBERS_ONLY);

    // And the sole owner cannot be removed or demoted, which would leave the
    // organization permanently unadministrable.
    await expect(
      removeMember(buyerOwner, buyerOrgId, buyerOwner)
    ).rejects.toThrow(LAST_OWNER);
    await expect(
      updateMemberRole(buyerOwner, buyerOrgId, buyerOwner, "member")
    ).rejects.toThrow(LAST_OWNER);
  });

  it("lets an owner change roles and remove a member", async () => {
    const {
      updateMemberRole,
      removeMember,
      createInvitation,
      acceptInvitation,
    } = await import("@/lib/procurement/organization-invitation-actions");
    const { listOrganizationMembers } = await import(
      "@/lib/procurement/organization-actions"
    );

    const temp: Ref = { memberId: uuid(), memberType: "employer" };
    const { token } = await createInvitation(buyerOwner, buyerOrgId, {
      role: "member",
    });
    await acceptInvitation(temp, token);

    const promoted = await updateMemberRole(
      buyerOwner,
      buyerOrgId,
      temp,
      "admin"
    );
    expect(promoted.role).toBe("admin");

    await removeMember(buyerOwner, buyerOrgId, temp);
    const members = await listOrganizationMembers(buyerOwner, buyerOrgId);
    expect(members.map((m) => m.memberId)).not.toContain(temp.memberId);
  });

  // -------------------------------------------------------------------
  // Connections
  // -------------------------------------------------------------------

  it("lets a supplier ask a buyer to connect, and the buyer accept", async () => {
    const { requestConnection, respondToConnection, listConnections } =
      await import("@/lib/procurement/connection-actions");

    const sent = await requestConnection(supplierOwner, {
      direction: "we_supply",
      fromOrganizationId: supplierOrgId,
      message: "We make hydraulic valves.",
      toOrganizationId: buyerOrgId,
    });
    expect(sent.status).toBe("pending");
    expect(sent.buyerOrgId).toBe(buyerOrgId);
    expect(sent.supplierOrgId).toBe(supplierOrgId);

    // The buyer sees it as incoming; the supplier as outgoing.
    const buyerView = await listConnections(buyerOwner, buyerOrgId);
    expect(buyerView.incoming.map((c) => c.id)).toContain(sent.id);
    expect(buyerView.incoming[0].counterpart?.id).toBe(supplierOrgId);
    const supplierView = await listConnections(supplierOwner, supplierOrgId);
    expect(supplierView.outgoing.map((c) => c.id)).toContain(sent.id);

    const accepted = await respondToConnection(buyerOwner, sent.id, "accepted");
    expect(accepted.status).toBe("accepted");

    // Both sides now see one relationship.
    const buyerAfter = await listConnections(buyerOwner, buyerOrgId);
    const supplierAfter = await listConnections(supplierOwner, supplierOrgId);
    expect(buyerAfter.accepted.map((c) => c.id)).toContain(sent.id);
    expect(supplierAfter.accepted.map((c) => c.id)).toContain(sent.id);
    expect(buyerAfter.accepted[0].isBuyer).toBe(true);
    expect(supplierAfter.accepted[0].isBuyer).toBe(false);
  });

  it("shows the accepted supplier in the buyer's approved network", async () => {
    const { listApprovedSuppliers } = await import(
      "@/lib/procurement/connection-actions"
    );
    const suppliers = await listApprovedSuppliers(buyerOwner, buyerOrgId);
    expect(suppliers.map((s) => s.id)).toContain(supplierOrgId);

    // Approval is per buyer: another business has approved nobody.
    const theirs = await listApprovedSuppliers(outsider, otherOrgId);
    expect(theirs.map((s) => s.id)).not.toContain(supplierOrgId);
  });

  it("refuses a second request in the same direction", async () => {
    const { requestConnection } = await import(
      "@/lib/procurement/connection-actions"
    );
    await expect(
      requestConnection(supplierOwner, {
        direction: "we_supply",
        fromOrganizationId: supplierOrgId,
        toOrganizationId: buyerOrgId,
      })
    ).rejects.toThrow(ALREADY_EXISTS_DIRECTION);
  });

  it("lets a buyer initiate, and allows the reverse trading direction", async () => {
    const { requestConnection, respondToConnection } = await import(
      "@/lib/procurement/connection-actions"
    );
    // otherOrg both buys and supplies, so the buyer organization can ask to
    // buy from it...
    const buying = await requestConnection(buyerOwner, {
      direction: "we_buy",
      fromOrganizationId: buyerOrgId,
      toOrganizationId: otherOrgId,
    });
    expect(buying.buyerOrgId).toBe(buyerOrgId);
    expect(buying.supplierOrgId).toBe(otherOrgId);
    const rejected = await respondToConnection(outsider, buying.id, "rejected");
    expect(rejected.status).toBe("rejected");

    // ...and a rejection does not block asking again, nor does it block the
    // opposite direction, which is a different relationship.
    const reverse = await requestConnection(outsider, {
      direction: "we_buy",
      fromOrganizationId: otherOrgId,
      toOrganizationId: supplierOrgId,
    });
    expect(reverse.buyerOrgId).toBe(otherOrgId);
    expect(reverse.supplierOrgId).toBe(supplierOrgId);
  });

  it("will not answer a request twice", async () => {
    const { requestConnection, respondToConnection } = await import(
      "@/lib/procurement/connection-actions"
    );
    const sent = await requestConnection(outsider, {
      direction: "we_supply",
      fromOrganizationId: otherOrgId,
      toOrganizationId: buyerOrgId,
    });
    await respondToConnection(buyerOwner, sent.id, "accepted");
    await expect(
      respondToConnection(buyerOwner, sent.id, "rejected")
    ).rejects.toThrow(ALREADY_ANSWERED);
  });

  it("enforces capabilities and refuses a self-connection", async () => {
    const { requestConnection } = await import(
      "@/lib/procurement/connection-actions"
    );
    // The supplier organization does not buy, so it cannot be the buyer.
    await expect(
      requestConnection(supplierOwner, {
        direction: "we_buy",
        fromOrganizationId: supplierOrgId,
        toOrganizationId: otherOrgId,
      })
    ).rejects.toThrow(NOT_A_BUYER);

    await expect(
      requestConnection(buyerOwner, {
        direction: "we_buy",
        fromOrganizationId: buyerOrgId,
        toOrganizationId: buyerOrgId,
      })
    ).rejects.toThrow(CANNOT_CONNECT_SELF);
  });

  it("keeps every connection operation inside the organization", async () => {
    const {
      requestConnection,
      respondToConnection,
      listConnections,
      listApprovedSuppliers,
    } = await import("@/lib/procurement/connection-actions");

    // Knowing a UUID is not authority: an outsider can neither send as
    // another business, nor read its connections, nor see its suppliers.
    await expect(
      requestConnection(outsider, {
        direction: "we_buy",
        fromOrganizationId: buyerOrgId,
        toOrganizationId: supplierOrgId,
      })
    ).rejects.toThrow(NOT_FOUND);
    await expect(listConnections(outsider, buyerOrgId)).rejects.toThrow(
      NOT_FOUND
    );
    await expect(listApprovedSuppliers(outsider, buyerOrgId)).rejects.toThrow(
      NOT_FOUND
    );

    // Nor can the sender accept its own pending request. A fresh supplier
    // is used so this does not collide with a directed pair an earlier test
    // already established - which the duplicate guard would reject first.
    const freshOwner: Ref = { memberId: uuid(), memberType: "employer" };
    const freshSupplierId = await makeOrg(
      freshOwner,
      "Fresh Supplier",
      false,
      true,
      true
    );
    const sent = await requestConnection(freshOwner, {
      direction: "we_supply",
      fromOrganizationId: freshSupplierId,
      toOrganizationId: otherOrgId,
    });
    await expect(
      respondToConnection(freshOwner, sent.id, "accepted")
    ).rejects.toThrow(NOT_FOUND);
  });

  it("will not connect to a business that is not listed publicly", async () => {
    const { requestConnection } = await import(
      "@/lib/procurement/connection-actions"
    );
    const hiddenOwner: Ref = { memberId: uuid(), memberType: "employer" };
    const hiddenId = await makeOrg(hiddenOwner, "Hidden", false, true, false);

    // Reaching an unlisted business by its id would leak its existence and
    // bypass the opt-in the directory is built on.
    await expect(
      requestConnection(buyerOwner, {
        direction: "we_buy",
        fromOrganizationId: buyerOrgId,
        toOrganizationId: hiddenId,
      })
    ).rejects.toThrow(NOT_FOUND);
  });

  it("requires a manager, not merely a member, to act on connections", async () => {
    const { requestConnection } = await import(
      "@/lib/procurement/connection-actions"
    );
    const { createInvitation, acceptInvitation } = await import(
      "@/lib/procurement/organization-invitation-actions"
    );
    const plain: Ref = { memberId: uuid(), memberType: "employer" };
    const { token } = await createInvitation(supplierOwner, supplierOrgId, {
      role: "member",
    });
    await acceptInvitation(plain, token);

    await expect(
      requestConnection(plain, {
        direction: "we_supply",
        fromOrganizationId: supplierOrgId,
        toOrganizationId: otherOrgId,
      })
    ).rejects.toThrow(ONLY_OWNER_OR_ADMIN);
  });

  it("denies the anon key every path to the new tables", async () => {
    const { anonKey } = localTarget();
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const invitations = await anon
      .from("organization_invitations")
      .select("id")
      .limit(1);
    expect(invitations.error).not.toBeNull();

    const connections = await anon
      .from("organization_connections")
      .select("id")
      .limit(1);
    expect(connections.error).not.toBeNull();
  });
});
