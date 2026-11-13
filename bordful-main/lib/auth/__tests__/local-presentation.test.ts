import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isLocalPresentationRequest,
  localPresentationEntry,
  presentationDestination,
} from "../local-presentation";

afterEach(() => vi.unstubAllEnvs());

const localEnvironment = {
  NODE_ENV: "development",
  PRESENTATION_PASSWORD: "test-only-fixture",
  SUPABASE_URL: "http://127.0.0.1:55432",
};

describe("local presentation authentication boundary", () => {
  it("bypasses the sign-in page only for the opted-in local presentation", () => {
    for (const [key, value] of Object.entries(localEnvironment))
      vi.stubEnv(key, value);
    expect(
      localPresentationEntry(
        "http://localhost:3000/sign-in",
        "/procurement/organizations?view=Messages"
      )
    ).toBe(
      "/demo?callbackUrl=%2Fprocurement%2Forganizations%3Fview%3DMessages"
    );
    vi.stubEnv("NODE_ENV", "production");
    expect(
      localPresentationEntry(
        "http://localhost:3000/sign-in",
        "/procurement/organizations"
      )
    ).toBeNull();
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "/demo",
    "/sign-in",
    "/procurement/../../sign-in",
    "javascript:alert(1)",
  ])(
    "does not redirect demo login to unsafe or looping callback %s",
    (callback) => {
      expect(presentationDestination(callback)).toBe(
        "/procurement/organizations"
      );
    }
  );
  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "accepts the opted-in loopback host %s",
    (host) => {
      expect(
        isLocalPresentationRequest(`http://${host}:3000/demo`, localEnvironment)
      ).toBe(true);
    }
  );
  it.each(["production", "test", undefined])(
    "rejects %s mode even with all demo settings present",
    (NODE_ENV) => {
      expect(
        isLocalPresentationRequest("http://localhost:3000/demo", {
          ...localEnvironment,
          NODE_ENV,
        })
      ).toBe(false);
    }
  );
  it.each([
    "https://example.com/demo",
    "http://localhost.example.com/demo",
    "http://localhost@evil.example/demo",
    "not a URL",
    "file:///demo",
  ])("rejects non-loopback or malformed URL %s", (url) => {
    expect(isLocalPresentationRequest(url, localEnvironment)).toBe(false);
  });
  it.each([
    { PRESENTATION_PASSWORD: undefined },
    { PRESENTATION_PASSWORD: "" },
    { SUPABASE_URL: "https://hosted.example.com" },
    { SUPABASE_URL: "http://127.0.0.1:3002" },
  ])(
    "requires the isolated database and an explicit demo password (%j)",
    (override) => {
      expect(
        isLocalPresentationRequest("http://localhost:3000/demo", {
          ...localEnvironment,
          ...override,
        })
      ).toBe(false);
    }
  );
});
