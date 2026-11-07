import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked at each function's own module boundary - these are the lowest-level
// collaborators authorizeCredentials/authJwtCallback call out to, and each is
// already covered by its own unit tests (lib/auth/__tests__/*.test.ts).
// Mocking them here isolates exactly what's unique to auth.ts: the
// accountType branching, role assignment, and session shape - not the DB
// lookups those tests already verify.
const verifyEmployerCredentialsMock = vi.fn();
const verifyRecruiterCredentialsMock = vi.fn();
const upsertJobSeekerMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/auth/employers", () => ({
  verifyEmployerCredentials: (...args: unknown[]) =>
    verifyEmployerCredentialsMock(...args),
}));
vi.mock("@/lib/auth/recruiter-accounts", () => ({
  verifyRecruiterCredentials: (...args: unknown[]) =>
    verifyRecruiterCredentialsMock(...args),
}));
vi.mock("@/lib/auth/job-seekers", () => ({
  upsertJobSeeker: (...args: unknown[]) => upsertJobSeekerMock(...args),
}));
vi.mock("@/lib/email/smtp", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

const { authJwtCallback, authSessionCallback } = await import(
  "@/lib/auth/callbacks"
);
const { authorizeCredentials } = await import(
  "@/lib/auth/credentials-authorize"
);
// authorize is typed as optional on next-auth's CredentialsConfig (any
// provider can omit it) - this one always defines it, so tests can call it
// directly without a non-null check at every call site.
const authorize = authorizeCredentials as NonNullable<
  typeof authorizeCredentials
>;

type JwtArgs = Parameters<typeof authJwtCallback>[0];
type SessionArgs = Parameters<typeof authSessionCallback>[0];
// NextAuth's own callback param/return types don't cleanly describe the
// app-specific fields (employerId/recruiterId/seekerId/role) added by
// types/next-auth.d.ts in a shape TS can read back after the call - these
// narrow the result to what this app actually puts there, for assertions
// only.
type TokenShape = {
  employerId?: string;
  recruiterId?: string;
  seekerId?: string;
  role?: string;
};
type SessionShape = { user?: { id?: string; role?: string } };

beforeEach(() => {
  verifyEmployerCredentialsMock.mockReset();
  verifyRecruiterCredentialsMock.mockReset();
  upsertJobSeekerMock.mockReset();
  sendEmailMock.mockReset();
});

// Each test below uses its own IP so the module-level rate limiter (shared,
// unreset state for the lifetime of this file) can't make an earlier test's
// attempts count against a later, unrelated one.
function requestFrom(ip: string): Request {
  return new Request("http://localhost/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": ip },
    method: "POST",
  });
}

describe("authorizeCredentials", () => {
  it("returns null without querying either table when email/password aren't strings", async () => {
    const result = await authorize(
      { email: { injected: true }, password: "x" },
      requestFrom("203.0.113.20")
    );

    expect(result).toBeNull();
    expect(verifyEmployerCredentialsMock).not.toHaveBeenCalled();
    expect(verifyRecruiterCredentialsMock).not.toHaveBeenCalled();
  });

  it("defaults to the employer table when accountType is omitted", async () => {
    verifyEmployerCredentialsMock.mockResolvedValueOnce({
      companyName: "Acme",
      email: "owner@acme.example",
      id: "emp_1",
    });

    const result = await authorize(
      { email: "owner@acme.example", password: "hunter2" },
      requestFrom("203.0.113.21")
    );

    expect(verifyEmployerCredentialsMock).toHaveBeenCalledWith(
      "owner@acme.example",
      "hunter2"
    );
    expect(verifyRecruiterCredentialsMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      email: "owner@acme.example",
      id: "emp_1",
      name: "Acme",
    });
  });

  it("queries only the recruiter table for accountType=recruiter, never falling back to employer", async () => {
    // Wrong table for these credentials - this is the anti-escalation case:
    // a failed recruiter lookup must not retry against the employer table.
    verifyRecruiterCredentialsMock.mockResolvedValueOnce(null);

    const result = await authorize(
      {
        accountType: "recruiter",
        email: "someone@example.com",
        password: "hunter2",
      },
      requestFrom("203.0.113.22")
    );

    expect(verifyRecruiterCredentialsMock).toHaveBeenCalledWith(
      "someone@example.com",
      "hunter2"
    );
    expect(verifyEmployerCredentialsMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("tags a successful recruiter login with accountType so the jwt callback can assign the recruiter role", async () => {
    verifyRecruiterCredentialsMock.mockResolvedValueOnce({
      email: "jamie@talentco.example",
      id: "rec_1",
      name: "Jamie Recruiter",
    });

    const result = await authorize(
      {
        accountType: "recruiter",
        email: "jamie@talentco.example",
        password: "hunter2",
      },
      requestFrom("203.0.113.23")
    );

    expect(result).toEqual({
      accountType: "recruiter",
      email: "jamie@talentco.example",
      id: "rec_1",
      name: "Jamie Recruiter",
    });
  });

  it("blocks further attempts from the same IP once the sign-in rate limit is exceeded", async () => {
    verifyEmployerCredentialsMock.mockResolvedValue(null);
    const ip = "203.0.113.24";

    for (let i = 0; i < 10; i++) {
      await authorize(
        { email: "nobody@example.com", password: "wrong" },
        requestFrom(ip)
      );
    }

    await expect(
      authorize(
        { email: "nobody@example.com", password: "wrong" },
        requestFrom(ip)
      )
    ).rejects.toThrow(/too many sign-in attempts/i);
  });
});

describe("authJwtCallback", () => {
  it("assigns the employer role/id for a credentials sign-in with no accountType tag", async () => {
    const result = (await authJwtCallback({
      account: { provider: "credentials" },
      token: {},
      user: { id: "emp_1" },
    } as unknown as JwtArgs)) as unknown as TokenShape;

    expect(result.role).toBe("employer");
    expect(result.employerId).toBe("emp_1");
    expect(result.recruiterId).toBeUndefined();
  });

  it("assigns the recruiter role/id when authorizeCredentials tagged the user accountType: recruiter", async () => {
    const result = (await authJwtCallback({
      account: { provider: "credentials" },
      token: {},
      user: { accountType: "recruiter", id: "rec_1" },
    } as unknown as JwtArgs)) as unknown as TokenShape;

    expect(result.role).toBe("recruiter");
    expect(result.recruiterId).toBe("rec_1");
    expect(result.employerId).toBeUndefined();
  });

  it("upserts a seeker and assigns the seeker role for an OAuth sign-in", async () => {
    upsertJobSeekerMock.mockResolvedValueOnce({
      email: "seeker@example.com",
      id: "seek_1",
      isNew: false,
      name: "Sam Seeker",
    });

    const result = (await authJwtCallback({
      account: { provider: "google", providerAccountId: "google-sub-123" },
      token: {},
      user: { email: "seeker@example.com", name: "Sam Seeker" },
    } as unknown as JwtArgs)) as unknown as TokenShape;

    expect(upsertJobSeekerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "seeker@example.com",
        provider: "google",
      })
    );
    expect(result.role).toBe("seeker");
    expect(result.seekerId).toBe("seek_1");
    expect(sendEmailMock).not.toHaveBeenCalled(); // returning user, not new
  });

  it("sends the welcome email only when the seeker account is newly created", async () => {
    upsertJobSeekerMock.mockResolvedValueOnce({
      email: "new@example.com",
      id: "seek_2",
      isNew: true,
      name: null,
    });
    sendEmailMock.mockResolvedValueOnce({ success: true });

    await authJwtCallback({
      account: { provider: "linkedin", providerAccountId: "li-456" },
      token: {},
      user: { email: "new@example.com", name: null },
    } as unknown as JwtArgs);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@example.com" })
    );
  });

  it("never blocks sign-in when the welcome email fails to send", async () => {
    upsertJobSeekerMock.mockResolvedValueOnce({
      email: "new2@example.com",
      id: "seek_3",
      isNew: true,
      name: null,
    });
    sendEmailMock.mockRejectedValueOnce(new Error("smtp down"));

    await expect(
      authJwtCallback({
        account: { provider: "google", providerAccountId: "g-789" },
        token: {},
        user: { email: "new2@example.com", name: null },
      } as unknown as JwtArgs)
    ).resolves.toBeDefined();
  });
});

describe("authSessionCallback", () => {
  it.each([
    ["employer", "employerId", "emp_1"],
    ["recruiter", "recruiterId", "rec_1"],
    ["seeker", "seekerId", "seek_1"],
  ] as const)(
    "maps token.role=%s to session.user.id from token.%s, not another role's id",
    async (role, idField, idValue) => {
      const token = { [idField]: idValue, role };
      const session = { user: { id: "", role: undefined } };

      const result = (await authSessionCallback({
        session,
        token,
      } as unknown as SessionArgs)) as unknown as SessionShape;

      expect(result.user?.id).toBe(idValue);
      expect(result.user?.role).toBe(role);
    }
  );

  it("leaves the session untouched when there is no user object", async () => {
    const session = { user: undefined };

    const result = (await authSessionCallback({
      session,
      token: { role: "employer" },
    } as unknown as SessionArgs)) as unknown as SessionShape;

    expect(result.user).toBeUndefined();
  });
});
