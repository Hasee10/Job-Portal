import bcrypt from 'bcryptjs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Same approach as lib/auth/__tests__/employers.test.ts - mock at the
// @supabase/supabase-js boundary, exercise the real verification logic.
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const createClientMock = vi.fn((..._args: unknown[]) => ({ from: fromMock }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

const { verifyRecruiterCredentials, RecruiterAuthError } = await import(
  '@/lib/auth/recruiter-accounts'
);

const TEST_PASSWORD = 'correct-horse-battery-staple';
let validHash: string;

beforeAll(async () => {
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

describe('verifyRecruiterCredentials', () => {
  it('throws a db_unavailable RecruiterAuthError when Supabase env vars are missing', async () => {
    vi.unstubAllEnvs();

    await expect(
      verifyRecruiterCredentials('someone@example.com', TEST_PASSWORD)
    ).rejects.toMatchObject({
      name: 'RecruiterAuthError',
      code: 'db_unavailable',
    });
    await expect(
      verifyRecruiterCredentials('someone@example.com', TEST_PASSWORD)
    ).rejects.toBeInstanceOf(RecruiterAuthError);
  });

  it('returns null when no recruiter matches the email', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await verifyRecruiterCredentials(
      'nobody@example.com',
      TEST_PASSWORD
    );

    expect(result).toBeNull();
  });

  it('returns null when the password does not match the stored hash', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        id: 'rec_1',
        email: 'recruiter@example.com',
        name: 'Jamie Recruiter',
        agency: null,
        specialties: [],
        linkedin_url: null,
        bio: null,
        is_verified: false,
        website: null,
        logo_url: null,
        industry: null,
        company_size: null,
        location: null,
        password_hash: validHash,
      },
      error: null,
    });

    const result = await verifyRecruiterCredentials(
      'recruiter@example.com',
      'wrong-password'
    );

    expect(result).toBeNull();
  });

  it('returns the mapped recruiter account when the password matches', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        id: 'rec_1',
        email: 'recruiter@example.com',
        name: 'Jamie Recruiter',
        agency: 'Talent Co',
        specialties: ['Engineering', 'Design'],
        linkedin_url: 'https://linkedin.com/in/jamie',
        bio: 'Finds great people.',
        is_verified: true,
        website: 'https://talentco.example',
        logo_url: null,
        industry: 'Staffing',
        company_size: '11-50',
        location: 'Remote',
        password_hash: validHash,
      },
      error: null,
    });

    const result = await verifyRecruiterCredentials(
      'RECRUITER@example.com',
      TEST_PASSWORD
    );

    expect(result).toEqual({
      id: 'rec_1',
      email: 'recruiter@example.com',
      name: 'Jamie Recruiter',
      agency: 'Talent Co',
      specialties: ['Engineering', 'Design'],
      linkedinUrl: 'https://linkedin.com/in/jamie',
      bio: 'Finds great people.',
      isVerified: true,
      website: 'https://talentco.example',
      logoUrl: null,
      industry: 'Staffing',
      companySize: '11-50',
      location: 'Remote',
    });
    expect(eqMock).toHaveBeenCalledWith('email', 'recruiter@example.com');
  });
});
