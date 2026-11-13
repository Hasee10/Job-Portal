import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/email/smtp", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/utils/rate-limit", () => ({
  createRateLimiter: () => () => false,
  getClientIp: () => "local",
}));
vi.mock("@/lib/auth/employers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/employers")>()),
  createEmployer: vi.fn(),
}));
import { auth } from "@/auth";
import { createEmployer, EmployerAuthError } from "@/lib/auth/employers";
import { POST } from "../route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(null as never);
});
const request = () =>
  new Request("http://localhost/api/employers/signup", {
    method: "POST",
    body: JSON.stringify({
      email: "example@example.test",
      password: "a-valid-test-password",
    }),
    headers: { "Content-Type": "application/json" },
  });
describe("signup route preserves existing identities", () => {
  it.each(["employer", "recruiter", "seeker"])(
    "does not create a new employer for authenticated %s",
    async (role) => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "verified-id", role },
      } as never);
      const response = await POST(request());
      expect(response.status).toBe(409);
      expect(createEmployer).not.toHaveBeenCalled();
    }
  );
  it("returns an actionable code without account identity details", async () => {
    vi.mocked(createEmployer).mockRejectedValue(
      new EmployerAuthError(
        "An account with this email already exists.",
        "email_taken"
      )
    );
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "An account with this email already exists.",
      code: "email_taken",
    });
    expect(createEmployer).toHaveBeenCalledTimes(1);
  });
});
