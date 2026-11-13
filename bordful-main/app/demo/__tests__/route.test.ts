import { afterEach, describe, expect, it, vi } from "vitest";
import { signIn } from "@/auth";
import { GET } from "../route";

vi.mock("@/auth", () => ({ signIn: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function configurePresentation() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:55432");
  vi.stubEnv("PRESENTATION_PASSWORD", "local-test-fixture");
}

describe("demo sign-in route", () => {
  it("is unavailable in production even when presentation credentials are configured", async () => {
    configurePresentation();
    vi.stubEnv("NODE_ENV", "production");
    const response = await GET(new Request("http://localhost:3000/demo"));
    expect(response?.status).toBe(404);
    expect(signIn).not.toHaveBeenCalled();
  });
  it("is unavailable for a hosted database or a remote request host", async () => {
    configurePresentation();
    expect((await GET(new Request("https://example.com/demo")))?.status).toBe(
      404
    );
    vi.stubEnv("SUPABASE_URL", "https://hosted.example.com");
    expect((await GET(new Request("http://localhost:3000/demo")))?.status).toBe(
      404
    );
    expect(signIn).not.toHaveBeenCalled();
  });
  it("issues an ordinary credentials session for the seeded account", async () => {
    configurePresentation();
    const redirect = new Error("normal-auth-redirect");
    vi.mocked(signIn).mockRejectedValueOnce(redirect);
    await expect(GET(new Request("http://localhost:3000/demo"))).rejects.toBe(
      redirect
    );
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "ihaseebarshad10@gmail.com",
      password: "local-test-fixture",
      redirectTo: "/procurement/organizations",
    });
  });
});
