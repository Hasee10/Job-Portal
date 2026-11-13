import { describe, expect, it } from "vitest";
import { isLocalPresentationRequest } from "../local-presentation";

const localEnvironment = {
  NODE_ENV: "development",
  PRESENTATION_PASSWORD: "test-only-fixture",
  SUPABASE_URL: "http://127.0.0.1:55432",
};

describe("local presentation authentication boundary", () => {
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
