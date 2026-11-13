import assert from "node:assert/strict";
import { test } from "node:test";
import { makeProcurementPresentation } from "./procurement-presentation-data.mjs";

const now = Date.parse("2026-11-13T10:00:00Z");
test("presentation access is confined to four private businesses and no public contacts", () => {
  const data = makeProcurementPresentation(now);
  const owned = data.members.filter(
    (member) => member.member_id === data.ownerId
  );
  assert.equal(owned.length, 4);
  assert.ok(
    owned.every(
      (member) => member.role === "owner" && member.member_type === "employer"
    )
  );
  assert.ok(
    data.organizations.every(
      (org) => !(org.is_public || org.public_contact_email || org.website)
    )
  );
  assert.ok(
    data.teamInvitations.every((invite) =>
      invite.invited_email.endsWith(".example.invalid")
    )
  );
  assert.deepEqual(makeProcurementPresentation(now), data);
});
test("every conversation has an accepted connection and a member of the sending business", () => {
  const data = makeProcurementPresentation(now);
  const connections = new Map(
    data.connections.map((connection) => [connection.id, connection])
  );
  for (const message of data.messages) {
    const connection = connections.get(message.connection_id);
    assert.equal(connection.status, "accepted");
    assert.ok(
      [connection.buyer_org_id, connection.supplier_org_id].includes(
        message.sender_org_id
      )
    );
    assert.ok(
      data.members.some(
        (member) =>
          member.organization_id === message.sender_org_id &&
          member.member_id === message.sender_member_id
      )
    );
  }
});
test("requests cover the workflow with matching invitations, quotations and award winners", () => {
  const data = makeProcurementPresentation(now);
  const requests = new Map(
    data.requests.map((request) => [request.id, request])
  );
  const invitations = new Map(
    data.invitations.map((invite) => [invite.id, invite])
  );
  const responses = new Map(
    data.responses.map((response) => [response.id, response])
  );
  assert.equal(new Set(data.requests.map((request) => request.status)).size, 7);
  assert.equal(new Set(data.requests.map((request) => request.type)).size, 4);
  for (const response of data.responses) {
    const invitation = invitations.get(response.invitation_id);
    assert.equal(invitation.request_id, response.request_id);
    assert.equal(invitation.supplier_org_id, response.supplier_org_id);
    assert.equal(invitation.status, "responded");
    assert.equal(response.vendor_id, null);
    assert.ok(Number(response.pricing.amount) > 0);
  }
  for (const award of data.awards) {
    const winner = responses.get(award.awarded_response_id);
    assert.equal(requests.get(award.id).status, "awarded");
    assert.equal(winner.request_id, award.id);
    assert.equal(winner.is_withdrawn, false);
  }
  for (const evaluation of data.evaluations) {
    assert.equal(
      responses.get(evaluation.response_id).request_id,
      evaluation.request_id
    );
    assert.ok(evaluation.score >= 0 && evaluation.score <= 100);
  }
  for (const request of data.requests) {
    if (
      ["closed_for_responses", "bids_opened", "evaluating", "awarded"].includes(
        request.status
      )
    ) {
      assert.ok(Date.parse(request.response_deadline) < now);
    }
    if (request.status === "published") {
      assert.ok(Date.parse(request.response_deadline) > now);
    }
    if (request.status === "bids_opened") {
      assert.equal(request.sealed_bids, true);
    }
  }
});
