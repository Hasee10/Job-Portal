import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/auth", () => ({ auth: (handler: unknown) => handler }));
import middleware from "../../../middleware";
const gate = middleware as unknown as (request: {
  auth: object | null;
  nextUrl: URL;
}) => Response | undefined;
afterEach(() => vi.unstubAllEnvs());
describe("restored Jobs authentication", () => {
  it.each(["development", "production"])(
    "requires a session on localhost in %s",
    (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      vi.stubEnv("LOCAL_DEMO_DATA", "true");
      const response = gate({
        auth: null,
        nextUrl: new URL("http://localhost:3000/jobs/types?q=remote"),
      });
      expect(response?.status).toBe(302);
      const destination = new URL(response!.headers.get("location")!);
      expect(destination.pathname).toBe("/account/sign-in");
      expect(destination.searchParams.get("callbackUrl")).toBe(
        "/jobs/types?q=remote"
      );
    }
  );
  it("also gates loopback IP requests", () => {
    expect(
      gate({ auth: null, nextUrl: new URL("http://127.0.0.1:3000/jobs") })
        ?.status
    ).toBe(302);
  });
  it("allows authenticated requests through", () => {
    expect(
      gate({
        auth: { user: { id: "example" } },
        nextUrl: new URL("http://localhost:3000/jobs"),
      })
    ).toBeUndefined();
  });
});
