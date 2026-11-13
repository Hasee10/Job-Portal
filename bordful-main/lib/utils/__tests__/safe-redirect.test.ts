import { describe, expect, it } from "vitest";
import { safeInternalRedirect } from "@/lib/utils/safe-redirect";

describe("safeInternalRedirect", () => {
  it("returns the fallback when target is null", () => {
    expect(safeInternalRedirect(null, "/account")).toBe("/account");
  });

  it("returns the fallback when target is undefined", () => {
    expect(safeInternalRedirect(undefined, "/account")).toBe("/account");
  });

  it("returns the fallback when target is an empty string", () => {
    expect(safeInternalRedirect("", "/account")).toBe("/account");
  });

  it("passes through a plain internal path", () => {
    expect(safeInternalRedirect("/jobs/type/engineering", "/account")).toBe(
      "/jobs/type/engineering"
    );
  });

  it("passes through an internal path with a query string", () => {
    expect(safeInternalRedirect("/jobs?remote=true&page=2", "/account")).toBe(
      "/jobs?remote=true&page=2"
    );
  });

  it("rejects a protocol-relative URL (open redirect)", () => {
    expect(safeInternalRedirect("//evil.example", "/account")).toBe("/account");
  });

  it("rejects an absolute http(s) URL", () => {
    expect(safeInternalRedirect("https://evil.example/phish", "/account")).toBe(
      "/account"
    );
    expect(safeInternalRedirect("http://evil.example/phish", "/account")).toBe(
      "/account"
    );
  });

  it("rejects a path that does not start with a slash", () => {
    expect(safeInternalRedirect("evil.example", "/account")).toBe("/account");
  });

  it("rejects a javascript: pseudo-protocol payload", () => {
    expect(safeInternalRedirect("javascript:alert(1)", "/account")).toBe(
      "/account"
    );
  });
});

describe("callback normalization attacks", () => {
  it.each([
    "/\\evil.example",
    "/%5cevil.example",
    "/%2fevil.example",
    "/\nevil.example",
    "/%09/evil.example",
    "https://evil.example",
    "//evil.example",
  ])("rejects %s", (target) => {
    expect(safeInternalRedirect(target, "/account")).toBe("/account");
  });
});

it("preserves legitimate encoded Jobs searches", () => {
  expect(safeInternalRedirect("/jobs?q=software%20engineer", "/account")).toBe(
    "/jobs?q=software%20engineer"
  );
});
