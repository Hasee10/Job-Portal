import bcrypt from 'bcryptjs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocked at the module boundary (@supabase/supabase-js), not the app's own
// code - this tests verifyEmployerCredentials' actual logic (missing-config
// handling, "no such user", hash comparison, row mapping) against a fake
// query result, not a real database.
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const createClientMock = vi.fn((..._args: unknown[]) => ({ from: fromMock }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

// Imported after the mock is registered above (vi.mock is hoisted by
// Vitest, so this ordering in source is fine either way, but keeping it
// explicit here for readability).
const { verifyEmployerCredentials, EmployerAuthError } = await import(
  '@/lib/auth/employers'
);

const TEST_PASSWORD = 'correct-horse-battery-staple';
let validHash: string;

beforeAll(async () => {
  // Low cost factor purely for test speed - verifyEmployerCredentials only
  // calls bcrypt.compare(), which works against a hash of any valid cost.
  validHash = await bcrypt.hash(TEST_PASSWORD, 4);
});

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  maybeSingleMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verifyEmployerCredentials', () => {
  it('throws a db_unavailable EmployerAuthError when Supabase env vars are missing', async () => {
    vi.unstubAllEnvs();

    await expect(
      verifyEmployerCredentials('someone@example.com', TEST_PASSWORD)
    ).rejects.toMatchObject({
      name: 'EmployerAuthError',
      code: 'db_unavailable',
    });
    await expect(
      verifyEmployerCredentials('someone@example.com', TEST_PASSWORD)
    ).rejects.toBeInstanceOf(EmployerAuthError);
  });

  it('returns null when no employer matches the email', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await verifyEmployerCredentials(
      'nobody@example.com',
      TEST_PASSWORD
    );

    expect(result).toBeNull();
  });

  it('returns null when the password does not match the stored hash', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        id: 'emp_1',
        email: 'employer@example.com',
        company_name: 'Acme Inc.',
        website: null,
        logo_url: null,
        industry: null,
        company_size: null,
        location: null,
        description: null,
        password_hash: validHash,
      },
      error: null,
    });

    const result = await verifyEmployerCredentials(
      'employer@example.com',
      'wrong-password'
    );

    expect(result).toBeNull();
  });

  it('returns the mapped employer when the password matches', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        id: 'emp_1',
        email: 'employer@example.com',
        company_name: 'Acme Inc.',
        website: 'https://acme.example',
        logo_url: null,
        industry: 'Software',
        company_size: '11-50',
        location: 'Remote',
        description: 'We build things.',
        password_hash: validHash,
      },
      error: null,
    });

    const result = await verifyEmployerCredentials(
      'EMPLOYER@example.com', // case should be normalized before lookup
      TEST_PASSWORD
    );

    expect(result).toEqual({
      id: 'emp_1',
      email: 'employer@example.com',
      companyName: 'Acme Inc.',
      website: 'https://acme.example',
      logoUrl: null,
      industry: 'Software',
      companySize: '11-50',
      location: 'Remote',
      description: 'We build things.',
    });
    // The lookup itself should have used the normalized (lowercased) email.
    expect(eqMock).toHaveBeenCalledWith('email', 'employer@example.com');
  });
});
