import { describe, expect, it } from "vitest";
import { SITE_LINKS, siteContext } from "../site-navigation";
describe("product-specific navigation", () => {
  it.each([
    "/procurement",
    "/procurement/preview",
    "/procurement/directory/example",
  ])("keeps Jobs out of %s", (path) => {
    expect(siteContext(path)).toBe("procurement");
    expect(
      SITE_LINKS[siteContext(path)].every((link) =>
        link.href.startsWith("/procurement")
      )
    ).toBe(true);
  });
  it.each([
    "/jobs/types",
    "/guides",
    "/guides/a-resume-that-shows-impact",
    "/masterclasses",
    "/account",
    "/pricing",
  ])("keeps Procurement out of %s", (path) => {
    expect(siteContext(path)).toBe("jobs");
    expect(
      SITE_LINKS[siteContext(path)].some((link) =>
        link.href.startsWith("/procurement")
      )
    ).toBe(false);
  });
  it("lets the main landing introduce both products", () => {
    expect(siteContext("/")).toBe("home");
    expect(SITE_LINKS.home.map((link) => link.href)).toEqual(
      expect.arrayContaining(["/jobs", "/procurement"])
    );
  });
});
