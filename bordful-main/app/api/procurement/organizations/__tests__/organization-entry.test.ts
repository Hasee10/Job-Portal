import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/procurement/organization-actions", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/procurement/organization-actions")
  >()),
  createOrganization: vi.fn(),
}));
import { auth } from "@/auth";
import { createOrganization } from "@/lib/procurement/organization-actions";
import { POST } from "../route";
beforeEach(() => {
  vi.clearAllMocks();
});
describe("organization entry uses session identity only", () => {
  it("forbids anonymous organization creation", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const response = await POST(
      new Request("http://localhost/x", { method: "POST" })
    );
    expect(response.status).toBe(401);
    expect(createOrganization).not.toHaveBeenCalled();
  });
  it.each(["employer", "recruiter", "seeker"])(
    "ignores posted ids and emails for %s",
    async (role) => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "verified-session-id", role, email: "shared@example.test" },
      } as never);
      vi.mocked(createOrganization).mockResolvedValue({
        id: "new-org",
      } as never);
      const response = await POST(
        new Request("http://localhost/x", {
          method: "POST",
          body: JSON.stringify({
            name: "Example",
            isBuyer: true,
            memberId: "victim",
            memberType: "employer",
            email: "victim@example.test",
            organizationId: "victim-org",
          }),
        })
      );
      expect(response.status).toBe(200);
      expect(createOrganization).toHaveBeenCalledWith(
        { memberId: "verified-session-id", memberType: role },
        expect.objectContaining({ name: "Example", isBuyer: true })
      );
      expect(vi.mocked(createOrganization).mock.calls[0][1]).not.toHaveProperty(
        "email"
      );
      expect(vi.mocked(createOrganization).mock.calls[0][1]).not.toHaveProperty(
        "memberId"
      );
    }
  );
});
