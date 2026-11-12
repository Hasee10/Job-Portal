import { describe, expect, it } from "vitest";
import { allowLocalJobsPreview } from "../local-jobs-preview";

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
