// Regression test for the HTTP defect flagged during M4B2-B review: the
// organization open-bids and start-evaluation routes only caught
// OrganizationResponseError, but assertCanIssueRfq/getOrganizationRequest
// (called before either action runs) throw OrganizationRfqError - a
// different class with the same {message, code} shape. An unauthorized or
// nonexistent-org caller therefore got a generic 500 instead of 404,
// leaking nothing sensitive but breaking the documented error contract.
//
// No fixtures are needed: assertCanIssueRfq's first check is
// getMemberRole(member, organizationId), which returns null (and so throws)
// for ANY member/organization pair with no matching row - random UUIDs are
// enough to exercise the not-found path these routes share with PR #101's
// evaluations/award routes. Gated the same way as the other local
// integration suites, since it still talks to the real local Postgres via
// PostgREST.

import { afterEach, describe, expect, it, vi } from "vitest";
import { localTarget } from "../../../../../lib/procurement/__tests__/local-integration-env";

const { canRun } = localTarget();
const describeLocal = canRun ? describe : describe.skip;
const NOT_FOUND = /not found/i;

vi.mock("@/auth", () => ({ auth: vi.fn() }));

afterEach(() => {
  vi.resetModules();
});

describeLocal("organization route error mapping", () => {
  it("open-bids returns 404, not 500, for an unrelated caller", async () => {
    const { auth } = await import("@/auth");
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: crypto.randomUUID(), role: "employer" },
    });
    const { POST } = await import(
      "../[id]/requests/[requestId]/open-bids/route"
    );

    const res = await POST(
      new Request("http://localhost/x", { method: "POST" }),
      {
        params: Promise.resolve({
          id: crypto.randomUUID(),
          requestId: crypto.randomUUID(),
        }),
      }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(NOT_FOUND);
  });

  it("start-evaluation returns 404, not 500, for an unrelated caller", async () => {
    const { auth } = await import("@/auth");
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: crypto.randomUUID(), role: "employer" },
    });
    const { POST } = await import(
      "../[id]/requests/[requestId]/start-evaluation/route"
    );

    const res = await POST(
      new Request("http://localhost/x", { method: "POST" }),
      {
        params: Promise.resolve({
          id: crypto.randomUUID(),
          requestId: crypto.randomUUID(),
        }),
      }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(NOT_FOUND);
  });
});
