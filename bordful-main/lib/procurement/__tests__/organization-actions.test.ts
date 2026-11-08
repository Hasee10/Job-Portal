import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";
import {
  canManageOrganization,
  resolveOrganizationMember,
  validateCapabilities,
} from "../organization-actions";

function sessionWith(
  role: string | undefined,
  id: string | undefined
): Session {
  return { user: { id, role } } as unknown as Session;
}

describe("validateCapabilities (buyer / supplier / both)", () => {
  it("accepts a buyer-only organization", () => {
    expect(validateCapabilities(true, false)).toEqual({ valid: true });
  });

  it("accepts a supplier-only organization", () => {
    expect(validateCapabilities(false, true)).toEqual({ valid: true });
  });

  it("accepts a dual-capability organization", () => {
    // The marketplace premise: one business buys and sells from one account.
    expect(validateCapabilities(true, true)).toEqual({ valid: true });
  });

  it("rejects an organization that is neither", () => {
    expect(validateCapabilities(false, false).valid).toBe(false);
  });
});

describe("canManageOrganization (profile write permission)", () => {
  it("allows an owner and an admin", () => {
    expect(canManageOrganization("owner")).toBe(true);
    expect(canManageOrganization("admin")).toBe(true);
  });

  it("denies a plain member", () => {
    expect(canManageOrganization("member")).toBe(false);
  });

  it("denies a non-member", () => {
    // getMemberRole returns null for anyone outside the organization, so
    // holding an organization id must not confer write access.
    expect(canManageOrganization(null)).toBe(false);
  });
});

describe("resolveOrganizationMember (identity comes from the session)", () => {
  it("maps employer, recruiter and seeker sessions to a member", () => {
    for (const role of ["employer", "recruiter", "seeker"]) {
      expect(resolveOrganizationMember(sessionWith(role, "user-1"))).toEqual({
        memberId: "user-1",
        memberType: role,
      });
    }
  });

  it("returns null for an unauthenticated caller", () => {
    expect(resolveOrganizationMember(null)).toBeNull();
    expect(
      resolveOrganizationMember(sessionWith(undefined, undefined))
    ).toBeNull();
  });

  it("returns null when a role carries no id", () => {
    expect(
      resolveOrganizationMember(sessionWith("employer", undefined))
    ).toBeNull();
  });

  it("does not treat the reserved vendor role as a person", () => {
    // 'vendor' identifies a vendor_accounts row, not a human member.
    expect(resolveOrganizationMember(sessionWith("vendor", "v-1"))).toBeNull();
  });
});
