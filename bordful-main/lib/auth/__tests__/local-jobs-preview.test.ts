import { describe, expect, it } from "vitest";
import {
  allowLocalJobsPreview,
  localJobsPreviewDestination,
} from "../local-jobs-preview";

describe("local Jobs preview", () => {
  it.each([
    "http://localhost:3000/jobs",
    "http://127.0.0.1:3000/jobs",
    "http://[::1]:3000/jobs",
  ])("permits loopback development: %s", (address) => {
    expect(allowLocalJobsPreview(new URL(address), "development")).toBe(true);
  });
  it.each(["production", "test", undefined])(
    "never bypasses in %s, even on localhost",
    (environment) => {
      expect(
        allowLocalJobsPreview(
          new URL("http://localhost:3000/jobs"),
          environment
        )
      ).toBe(false);
    }
  );
  it.each([
    "https://joblo.example/jobs",
    "http://localhost.example/jobs",
    "http://192.168.1.10:3000/jobs",
  ])("rejects non-loopback hosts: %s", (address) => {
    expect(allowLocalJobsPreview(new URL(address), "development")).toBe(false);
  });
});

describe("local sign-in preview destination", () => {
  const url = new URL("http://localhost:3000/account/sign-in");
  it("preserves a Jobs callback and search filters", () => {
    expect(
      localJobsPreviewDestination(url, "development", "/jobs/types?type=remote")
    ).toBe("/jobs/types?type=remote");
  });
  it.each([
    undefined,
    "/account",
    "/jobs-evil",
    "https://evil.example/jobs",
    "//evil.example/jobs",
  ])("uses Jobs instead of an unsafe or protected callback: %s", (callback) => {
    expect(localJobsPreviewDestination(url, "development", callback)).toBe(
      "/jobs"
    );
  });
  it("keeps real OAuth sign-in in production even on localhost", () => {
    expect(localJobsPreviewDestination(url, "production", "/jobs")).toBeNull();
  });
  it("keeps real OAuth sign-in on non-loopback development hosts", () => {
    expect(
      localJobsPreviewDestination(
        new URL("https://joblo.example/account/sign-in"),
        "development"
      )
    ).toBeNull();
  });
});
