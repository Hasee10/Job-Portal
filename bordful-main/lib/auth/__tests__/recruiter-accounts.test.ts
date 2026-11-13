import bcrypt from "bcryptjs";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Same approach as lib/auth/__tests__/employers.test.ts - mock at the
// @supabase/supabase-js boundary, exercise the real verification logic.
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const createClientMock = vi.fn((..._args: unknown[]) => ({ from: fromMock }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

const {
  createRecruiterAccount,
  verifyRecruiterCredentials,
  RecruiterAuthError,
} = await import("@/lib/auth/recruiter-accounts");

const TEST_PASSWORD = "correct-horse-battery-staple";
let validHash: string;

beforeAll(async () => {
  validHash = await bcrypt.hash(TEST_PASSWORD, 4);
});

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  maybeSingleMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createRecruiterAccount", () => {
  it("rejects an email longer than 254 characters without attempting to create the account", async () => {
    // Same guard, same reason as lib/auth/__tests__/employers.test.ts's
    // equivalent test - see MAX_EMAIL_LENGTH's comment in
    // lib/auth/recruiter-accounts.ts.
    const overlongLocalPart = "a".repeat(255);
    fromMock.mockClear(); // isolate this assertion from any earlier test's calls

    await expect(
      createRecruiterAccount(
        `${overlongLocalPart}@example.com`,
        TEST_PASSWORD,
        "Jamie Recruiter"
      )
    ).rejects.toMatchObject({ code: "invalid_email" });
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("verifyRecruiterCredentials", () => {
  it("throws a db_unavailable RecruiterAuthError when Supabase env vars are missing", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(
      verifyRecruiterCredentials("someone@example.com", TEST_PASSWORD)
    ).rejects.toMatchObject({
      code: "db_unavailable",
      name: "RecruiterAuthError",
    });
    await expect(
      verifyRecruiterCredentials("someone@example.com", TEST_PASSWORD)
    ).rejects.toBeInstanceOf(RecruiterAuthError);
  });

  it("returns null when no recruiter matches the email", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await verifyRecruiterCredentials(
      "nobody@example.com",
      TEST_PASSWORD
    );

    expect(result).toBeNull();
  });

  it("returns null when the password does not match the stored hash", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        agency: null,
        bio: null,
        company_size: null,
        email: "recruiter@example.com",
        id: "rec_1",
        industry: null,
        is_verified: false,
        linkedin_url: null,
        location: null,
        logo_url: null,
        name: "Jamie Recruiter",
        password_hash: validHash,
        specialties: [],
        website: null,
      },
      error: null,
    });

    const result = await verifyRecruiterCredentials(
      "recruiter@example.com",
      "wrong-password"
    );

    expect(result).toBeNull();
  });

  it("returns the mapped recruiter account when the password matches", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        agency: "Talent Co",
        bio: "Finds great people.",
        company_size: "11-50",
        email: "recruiter@example.com",
        id: "rec_1",
        industry: "Staffing",
        is_verified: true,
        linkedin_url: "https://linkedin.com/in/jamie",
        location: "Remote",
        logo_url: null,
        name: "Jamie Recruiter",
        password_hash: validHash,
        specialties: ["Engineering", "Design"],
        website: "https://talentco.example",
      },
      error: null,
    });

    const result = await verifyRecruiterCredentials(
      "RECRUITER@example.com",
      TEST_PASSWORD
    );

    expect(result).toEqual({
      agency: "Talent Co",
      bio: "Finds great people.",
      companySize: "11-50",
      email: "recruiter@example.com",
      id: "rec_1",
      industry: "Staffing",
      isVerified: true,
      linkedinUrl: "https://linkedin.com/in/jamie",
      location: "Remote",
      logoUrl: null,
      name: "Jamie Recruiter",
      specialties: ["Engineering", "Design"],
      website: "https://talentco.example",
    });
    expect(eqMock).toHaveBeenCalledWith("email", "recruiter@example.com");
  });
});
