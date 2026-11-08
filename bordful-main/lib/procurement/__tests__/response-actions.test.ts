import { describe, expect, it } from "vitest";
import {
  canStartEvaluation,
  canVendorSubmitResponse,
  isSealedFromBuyer,
  isSubmissionWindowOpen,
} from "../response-actions";

describe("canVendorSubmitResponse (prequalification gate)", () => {
  it("allows any vendor on an open-visibility request regardless of invitation", () => {
    expect(canVendorSubmitResponse("open", null)).toEqual({ allowed: true });
  });

  it("rejects an invite-only request with no invitation at all", () => {
    const result = canVendorSubmitResponse("invite_only", null);
    expect(result.allowed).toBe(false);
  });

  it('allows a vendor whose invitation is simply "invited" (no prequalification required)', () => {
    expect(canVendorSubmitResponse("invite_only", "invited")).toEqual({
      allowed: true,
    });
  });

  it("allows a vendor whose invitation has been viewed", () => {
    expect(canVendorSubmitResponse("invite_only", "viewed")).toEqual({
      allowed: true,
    });
  });

  it("allows a vendor explicitly approved through prequalification", () => {
    expect(
      canVendorSubmitResponse("invite_only", "prequalification_approved")
    ).toEqual({ allowed: true });
  });

  it("blocks a vendor whose prequalification is still pending buyer approval", () => {
    const result = canVendorSubmitResponse(
      "invite_only",
      "prequalification_pending"
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toMatch(/pending buyer approval/i);
    }
  });

  it("blocks a vendor whose prequalification was rejected", () => {
    const result = canVendorSubmitResponse(
      "invite_only",
      "prequalification_rejected"
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toMatch(/not approved/i);
    }
  });

  it("blocks a vendor who already responded (cannot resubmit through this gate)", () => {
    const result = canVendorSubmitResponse("invite_only", "responded");
    expect(result.allowed).toBe(false);
  });

  it("blocks a vendor who declined the invitation", () => {
    const result = canVendorSubmitResponse("invite_only", "declined");
    expect(result.allowed).toBe(false);
  });
});

describe("isSealedFromBuyer (sealed-bid visibility rule)", () => {
  it("is not sealed when the request does not use sealed bidding", () => {
    expect(isSealedFromBuyer(false, "published")).toBe(false);
    expect(isSealedFromBuyer(false, "closed_for_responses")).toBe(false);
  });

  it("hides content from the buyer while published and sealed", () => {
    expect(isSealedFromBuyer(true, "published")).toBe(true);
  });

  it("hides content from the buyer once closed for responses but not yet opened", () => {
    expect(isSealedFromBuyer(true, "closed_for_responses")).toBe(true);
  });

  it("reveals content once bids have been explicitly opened", () => {
    expect(isSealedFromBuyer(true, "bids_opened")).toBe(false);
  });

  it("reveals content during evaluation and after award", () => {
    expect(isSealedFromBuyer(true, "evaluating")).toBe(false);
    expect(isSealedFromBuyer(true, "awarded")).toBe(false);
  });
});

describe("canStartEvaluation (sealed bids cannot skip openBids)", () => {
  it("blocks a sealed request from entering evaluation straight from closed_for_responses", () => {
    // Regression: evaluating is in OPEN_RESPONSE_STATUSES, so allowing this
    // transition revealed every sealed bid without the deadline check or the
    // bids_opened audit entry that openBids() exists to produce.
    const result = canStartEvaluation(true, "closed_for_responses");
    expect(result.allowed).toBe(false);
  });

  it("allows a sealed request to evaluate once bids have been opened", () => {
    expect(canStartEvaluation(true, "bids_opened")).toEqual({ allowed: true });
  });

  it("allows an unsealed request to evaluate directly from closed_for_responses", () => {
    expect(canStartEvaluation(false, "closed_for_responses")).toEqual({
      allowed: true,
    });
  });

  it("rejects statuses that are not ready for evaluation at all", () => {
    for (const status of ["draft", "published", "awarded", "cancelled"]) {
      expect(canStartEvaluation(false, status).allowed).toBe(false);
    }
  });
});

describe("isSubmissionWindowOpen (submit/upload/withdraw window)", () => {
  const future = "2999-01-01T00:00:00.000Z";
  const past = "2000-01-01T00:00:00.000Z";

  it("is open on a published request before the deadline", () => {
    expect(isSubmissionWindowOpen("published", future)).toEqual({ open: true });
  });

  it("is open on a published request with no deadline set", () => {
    expect(isSubmissionWindowOpen("published", null)).toEqual({ open: true });
  });

  it("is closed once the deadline has passed", () => {
    expect(isSubmissionWindowOpen("published", past).open).toBe(false);
  });

  it("is closed for every post-submission state, so bids cannot be pulled or amended", () => {
    for (const status of [
      "closed_for_responses",
      "bids_opened",
      "evaluating",
      "awarded",
      "cancelled",
    ]) {
      expect(isSubmissionWindowOpen(status, future).open).toBe(false);
    }
  });
});
