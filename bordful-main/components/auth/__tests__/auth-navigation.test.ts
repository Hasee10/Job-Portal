import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "seeker" }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { role: state.role, name: "Example user" } },
  }),
  signOut: vi.fn(),
}));
import { AuthNavStatus } from "../AuthNavStatus";
describe("workspace destinations", () => {
  it.each([
    ["seeker", "/account", "Job account"],
    ["employer", "/dashboard", "Hiring workspace"],
    ["recruiter", "/recruiter/dashboard", "Recruiter workspace"],
  ])(
    "preserves %s workspace and a single business entry",
    (role, href, label) => {
      vi.stubGlobal("React", React);
      state.role = role;
      const html = renderToStaticMarkup(
        React.createElement(AuthNavStatus, { variant: "mobile" })
      );
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(label);
      expect(html.match(/href="\/procurement\/organizations"/g)).toHaveLength(
        1
      );
      expect(html).toContain("Procurement dashboard");
    }
  );
  it("hides hiring account destinations in Procurement", () => {
    vi.stubGlobal("React", React);
    state.role = "employer";
    const html = renderToStaticMarkup(
      React.createElement(AuthNavStatus, {
        variant: "mobile",
        context: "procurement",
      })
    );
    expect(html).toContain("Procurement dashboard");
    expect(html).not.toContain('href="/dashboard"');
  });
  it("keeps the procurement dashboard accessible from Jobs account navigation", () => {
    vi.stubGlobal("React", React);
    state.role = "seeker";
    const html = renderToStaticMarkup(
      React.createElement(AuthNavStatus, { variant: "mobile", context: "jobs" })
    );
    expect(html).toContain("Job account");
    expect(html).toContain("Resume builder");
    expect(html).toContain('href="/procurement/organizations"');
    expect(html).toContain("Procurement dashboard");
  });
});
