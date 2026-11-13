import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  jobs: vi.fn(),
  count: vi.fn(),
  stats: vi.fn(),
  testimonials: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/jobs.server", () => ({
  getJobs: mocks.jobs,
  getActiveJobsCount: mocks.count,
  getHomepageJobStats: mocks.stats,
}));
vi.mock("@/lib/content/testimonial-actions", () => ({
  listPublishedTestimonials: mocks.testimonials,
}));
vi.mock("@/lib/utils/metadata", () => ({ generateMetadata: () => ({}) }));
vi.mock("@/components/home/SeekerHome", () => ({ SeekerHome: () => null }));
vi.mock("@/components/home/TrustSection", () => ({ TrustSection: () => null }));
import Home from "@/app/page";
import { PublicLanding } from "../PublicLanding";

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
});
describe("public landing resilience", () => {
  it.each([null, "employer", "recruiter"])(
    "renders both paths without querying Jobs for %s",
    async (role) => {
      mocks.auth.mockResolvedValue(role ? { user: { role } } : null);
      const html = renderToStaticMarkup(await Home());
      expect(html).toContain("Your next opportunity.");
      expect(html).toContain('href="/jobs"');
      expect(html).toContain('href="/procurement"');
      expect(html).toContain("Your career journey");
      expect(html).toContain("Your business journey");
      expect(mocks.jobs).not.toHaveBeenCalled();
      expect(mocks.stats).not.toHaveBeenCalled();
      expect(mocks.count).not.toHaveBeenCalled();
      expect(mocks.testimonials).not.toHaveBeenCalled();
      expect(html).not.toContain("92%");
      expect(html).not.toContain("0 open roles");
    }
  );
  it("keeps the full landing when a Jobs outage notice is shown", () => {
    const html = renderToStaticMarkup(
      React.createElement(PublicLanding, { jobsUnavailable: true })
    );
    expect(html).toContain("Job listings are temporarily unavailable");
    expect(html).toContain("Your next opportunity.");
    expect(html).toContain("Your business journey");
  });
});
