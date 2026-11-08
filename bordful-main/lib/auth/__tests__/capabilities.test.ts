import { describe, expect, it } from "vitest";
import {
  capabilitiesFor,
  hasProcurementAccess,
  procurementWorkspaceHref,
} from "@/lib/auth/capabilities";

describe("capabilitiesFor", () => {
  it("grants a job seeker recruitment only, never procurement", () => {
    const capabilities = capabilitiesFor("seeker");
    expect(capabilities.recruitment).toBe(true);
    expect(capabilities.procurementBuyer).toBe(false);
    expect(capabilities.procurementSupplier).toBe(false);
    expect(hasProcurementAccess(capabilities)).toBe(false);
  });

  it("makes an employer a procurement buyer but not a supplier", () => {
    const capabilities = capabilitiesFor("employer");
    expect(capabilities.procurementBuyer).toBe(true);
    expect(capabilities.procurementSupplier).toBe(false);
  });

  it("makes a recruiter a procurement supplier but not a buyer", () => {
    const capabilities = capabilitiesFor("recruiter");
    expect(capabilities.procurementSupplier).toBe(true);
    expect(capabilities.procurementBuyer).toBe(false);
  });

  it("treats an unknown or missing role as a guest with no capabilities", () => {
    for (const role of [null, undefined, "", "admin", "superuser"]) {
      const capabilities = capabilitiesFor(role);
      expect(capabilities.recruitment).toBe(false);
      expect(hasProcurementAccess(capabilities)).toBe(false);
    }
  });
});

describe("procurementWorkspaceHref", () => {
  it("sends a buyer to their requests and a supplier to the vendor workspace", () => {
    expect(procurementWorkspaceHref(capabilitiesFor("employer"))).toBe(
      "/procurement/requests"
    );
    expect(procurementWorkspaceHref(capabilitiesFor("recruiter"))).toBe(
      "/procurement/vendor"
    );
  });

  it("gives an account with no procurement capability no workspace at all", () => {
    expect(procurementWorkspaceHref(capabilitiesFor("seeker"))).toBeNull();
    expect(procurementWorkspaceHref(capabilitiesFor(null))).toBeNull();
  });

  it("prefers the buyer workspace once an account can be both", () => {
    // Guards the forward path to dual-capability organizations: the helper
    // must stay total when both flags are set, rather than assuming the two
    // are mutually exclusive the way the current role model happens to make
    // them. See the comment on BY_ROLE in capabilities.ts.
    expect(
      procurementWorkspaceHref({
        procurementBuyer: true,
        procurementSupplier: true,
        recruitment: true,
        workspaceHref: "/dashboard",
      })
    ).toBe("/procurement/requests");
  });
});
