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

// Mocked at the module boundary (@supabase/supabase-js), not the app's own
// code - this tests verifyEmployerCredentials' actual logic (missing-config
// handling, "no such user", hash comparison, row mapping) against a fake
// query result, not a real database.
const insertSingleMock = vi.fn();
const insertMock = vi.fn(() => ({
  select: () => ({ single: insertSingleMock }),
}));
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock, insert: insertMock }));
const createClientMock = vi.fn((..._args: unknown[]) => ({ from: fromMock }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

// Imported after the mock is registered above (vi.mock is hoisted by
// Vitest, so this ordering in source is fine either way, but keeping it
// explicit here for readability).
const { createEmployer, verifyEmployerCredentials, EmployerAuthError } =
  await import("@/lib/auth/employers");

const TEST_PASSWORD = "correct-horse-battery-staple";
let validHash: string;

beforeAll(async () => {
  // Low cost factor purely for test speed - verifyEmployerCredentials only
  // calls bcrypt.compare(), which works against a hash of any valid cost.
  validHash = await bcrypt.hash(TEST_PASSWORD, 4);
});

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  maybeSingleMock.mockReset();
  insertSingleMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createEmployer", () => {
  it.each([
    {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "employers_email_key"',
    },
    {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "custom_email_index"',
      details: "Key (email)=(example@example.test) already exists.",
    },
  ])("recognizes only a proven email conflict", async (error) => {
    insertSingleMock.mockResolvedValueOnce({ data: null, error });
    await expect(
      createEmployer("example@example.test", TEST_PASSWORD)
    ).rejects.toMatchObject({ code: "email_taken" });
  });
  it("does not mislabel an id conflict as a duplicate email", async () => {
    const error = {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "employers_pkey"',
      details: "Key (id)=(example) already exists.",
    };
    insertSingleMock.mockResolvedValueOnce({ data: null, error });
    await expect(
      createEmployer("example@example.test", TEST_PASSWORD)
    ).rejects.toBe(error);
  });

  it("rejects an email longer than 254 characters without attempting to create the account", async () => {
    // EMAIL_REGEX's own `+` quantifiers are unbounded - this guards the
    // length separately so an absurdly long (but pattern-valid) address
    // can't reach nodemailer's address parser later (see MAX_EMAIL_LENGTH's
    // comment in lib/auth/employers.ts for the specific advisories this
    // heads off).
    const overlongLocalPart = "a".repeat(255);
    fromMock.mockClear(); // isolate this assertion from any earlier test's calls

    await expect(
      createEmployer(`${overlongLocalPart}@example.com`, TEST_PASSWORD)
    ).rejects.toMatchObject({ code: "invalid_email" });
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("verifyEmployerCredentials", () => {
  it("throws a db_unavailable EmployerAuthError when Supabase env vars are missing", async () => {
    vi.unstubAllEnvs();

    await expect(
      verifyEmployerCredentials("someone@example.com", TEST_PASSWORD)
    ).rejects.toMatchObject({
      code: "db_unavailable",
      name: "EmployerAuthError",
    });
    await expect(
      verifyEmployerCredentials("someone@example.com", TEST_PASSWORD)
    ).rejects.toBeInstanceOf(EmployerAuthError);
  });

  it("returns null when no employer matches the email", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await verifyEmployerCredentials(
      "nobody@example.com",
      TEST_PASSWORD
    );

    expect(result).toBeNull();
  });

  it("returns null when the password does not match the stored hash", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        company_name: "Acme Inc.",
        company_size: null,
        description: null,
        email: "employer@example.com",
        id: "emp_1",
        industry: null,
        location: null,
        logo_url: null,
        password_hash: validHash,
        website: null,
      },
      error: null,
    });

    const result = await verifyEmployerCredentials(
      "employer@example.com",
      "wrong-password"
    );

    expect(result).toBeNull();
  });

  it("returns the mapped employer when the password matches", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        company_name: "Acme Inc.",
        company_size: "11-50",
        description: "We build things.",
        email: "employer@example.com",
        id: "emp_1",
        industry: "Software",
        location: "Remote",
        logo_url: null,
        password_hash: validHash,
        website: "https://acme.example",
      },
      error: null,
    });

    const result = await verifyEmployerCredentials(
      "EMPLOYER@example.com", // case should be normalized before lookup
      TEST_PASSWORD
    );

    expect(result).toEqual({
      companyName: "Acme Inc.",
      companySize: "11-50",
      description: "We build things.",
      email: "employer@example.com",
      id: "emp_1",
      industry: "Software",
      location: "Remote",
      logoUrl: null,
      website: "https://acme.example",
    });
    // The lookup itself should have used the normalized (lowercased) email.
    expect(eqMock).toHaveBeenCalledWith("email", "employer@example.com");
  });
});
