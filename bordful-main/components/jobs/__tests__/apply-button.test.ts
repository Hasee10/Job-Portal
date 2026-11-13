import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../ApplyModal", () => ({ ApplyModal: () => null }));
import { ApplyButton } from "../ApplyButton";
beforeEach(() => vi.stubGlobal("React", React));
describe("application destinations", () => {
  const base = {
    jobId: "demo",
    jobTitle: "Example role",
    size: "default" as const,
    fullWidth: true,
  };
  it("disables application when neither an in-app flow nor an external link exists", () => {
    const html = renderToStaticMarkup(
      React.createElement(ApplyButton, {
        ...base,
        acceptsApplications: false,
        applyUrl: "",
      })
    );
    expect(html).toContain("Applications unavailable");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('href=""');
  });
  it("preserves valid external applications", () => {
    const html = renderToStaticMarkup(
      React.createElement(ApplyButton, {
        ...base,
        acceptsApplications: false,
        applyUrl: "https://example.com/apply",
      })
    );
    expect(html).toContain('href="https://example.com/apply"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('disabled=""');
  });
  it("keeps an enabled in-app application button without requiring an external URL", () => {
    const html = renderToStaticMarkup(
      React.createElement(ApplyButton, {
        ...base,
        acceptsApplications: true,
        applyUrl: "",
      })
    );
    expect(html).toContain("Apply Now");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('href=""');
  });
});
