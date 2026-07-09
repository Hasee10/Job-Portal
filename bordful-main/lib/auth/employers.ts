import 'server-only';

import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db/pool';

// Cost factor 12 - the current recommended minimum (OWASP), high enough to
// resist offline brute-force but not so high it noticeably slows sign-in.
const BCRYPT_COST_FACTOR = 12;
const MIN_PASSWORD_LENGTH = 8;

export type Employer = {
  id: string;
  email: string;
  companyName: string | null;
};

export class EmployerAuthError extends Error {
  constructor(
    message: string,
    // Machine-readable reason so callers (API routes) can map to the right
    // HTTP status/UI copy without parsing the message string.
    public code: 'invalid_email' | 'weak_password' | 'email_taken' | 'invalid_credentials' | 'db_unavailable'
  ) {
    super(message);
    this.name = 'EmployerAuthError';
  }
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function requirePool() {
  const pool = getPool();
  if (!pool) {
    throw new EmployerAuthError(
      'Database is not configured on this deployment.',
      'db_unavailable'
    );
  }
  return pool;
}

/**
 * Creates a new employer account. Throws EmployerAuthError with a specific
 * code for every validation failure - never leaks whether a given email is
 * already registered beyond a generic "email_taken" (no account-enumeration
 * detail like "this email has a different password" etc).
 */
export async function createEmployer(
  email: string,
  password: string,
  companyName?: string
): Promise<Employer> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new EmployerAuthError('Enter a valid email address.', 'invalid_email');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new EmployerAuthError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      'weak_password'
    );
  }

  const pool = requirePool();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  try {
    const { rows } = await pool.query(
      `insert into public.employers (email, password_hash, company_name)
       values ($1, $2, $3)
       returning id, email, company_name`,
      [normalizedEmail, passwordHash, companyName?.trim() || null]
    );
    const row = rows[0];
    return { id: row.id, email: row.email, companyName: row.company_name };
  } catch (error: unknown) {
    // CockroachDB/Postgres unique_violation
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      throw new EmployerAuthError(
        'An account with this email already exists.',
        'email_taken'
      );
    }
    throw error;
  }
}

/**
 * Verifies email/password and returns the employer if valid, or null.
 * Deliberately returns null rather than throwing on a bad password/unknown
 * email - both cases render the exact same "Invalid email or password" to
 * the caller, so a login attempt can't be used to enumerate which emails
 * are registered.
 */
export async function verifyEmployerCredentials(
  email: string,
  password: string
): Promise<Employer | null> {
  const pool = requirePool();
  const normalizedEmail = email.trim().toLowerCase();

  const { rows } = await pool.query(
    `select id, email, password_hash, company_name from public.employers where email = $1`,
    [normalizedEmail]
  );
  if (rows.length === 0) {
    // Run a hash comparison anyway against a dummy value so the response
    // time doesn't reveal "email not found" vs "wrong password" via timing.
    await bcrypt.compare(password, '$2a$12$' + 'a'.repeat(53));
    return null;
  }

  const row = rows[0];
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return null;
  }

  return { id: row.id, email: row.email, companyName: row.company_name };
}
