import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ host: "localhost:3000" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: state.host }),
}));
import { localBusinessPreviewHref } from "../business-preview";
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("LOCAL_DEMO_DATA", "true");
  state.host = "localhost:3000";
});
afterEach(() => vi.unstubAllEnvs());
describe("local business preview isolation", () => {
  it.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000"])(
    "allows opted-in local development on %s",
    async (host) => {
      state.host = host;
      expect(await localBusinessPreviewHref()).toBe("/procurement/preview");
    }
  );
  it("maps organization callbacks without creating a session", async () => {
    expect(
      await localBusinessPreviewHref(
        "/procurement/organizations/example/requests"
      )
    ).toBe("/procurement/preview");
  });
  it("cannot activate in production even with the flag and localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await localBusinessPreviewHref()).toBeNull();
  });
  it("requires the explicit demo flag", async () => {
    vi.stubEnv("LOCAL_DEMO_DATA", "false");
    expect(await localBusinessPreviewHref()).toBeNull();
  });
  it.each(["example.com", "localhost.example.com", "192.168.1.10:3000"])(
    "rejects non-loopback host %s",
    async (host) => {
      state.host = host;
      expect(await localBusinessPreviewHref()).toBeNull();
    }
  );
  it.each([
    "https://evil.example/procurement/organizations",
    "/dashboard",
    "/procurement/organizations-evil",
  ])("does not bypass other login destinations: %s", async (callback) => {
    expect(await localBusinessPreviewHref(callback)).toBeNull();
  });
});
