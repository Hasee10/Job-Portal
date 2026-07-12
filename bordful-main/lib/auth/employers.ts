import 'server-only';

import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const BCRYPT_COST_FACTOR = 12;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export type Employer = {
  id: string;
  email: string;
  companyName: string | null;
};

export class EmployerAuthError extends Error {
  constructor(
    message: string,
    public code: 'invalid_email' | 'weak_password' | 'email_taken' | 'invalid_credentials' | 'db_unavailable'
  ) {
    super(message);
    this.name = 'EmployerAuthError';
  }
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new EmployerAuthError(
      'Database is not configured on this deployment.',
      'db_unavailable'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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

  const supabase = getAdminClient();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  const { data, error } = await supabase
    .from('employers')
    .insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      company_name: companyName?.trim() || null,
    })
    .select('id, email, company_name')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new EmployerAuthError(
        'An account with this email already exists.',
        'email_taken'
      );
    }
    throw error;
  }

  return { id: data.id, email: data.email, companyName: data.company_name };
}

export async function verifyEmployerCredentials(
  email: string,
  password: string
): Promise<Employer | null> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data } = await supabase
    .from('employers')
    .select('id, email, password_hash, company_name')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!data) {
    // Constant-time dummy compare so timing can't reveal "email not found"
    await bcrypt.compare(password, '$2a$12$' + 'a'.repeat(53));
    return null;
  }

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) return null;

  return { id: data.id, email: data.email, companyName: data.company_name };
}

export async function createPasswordResetToken(
  email: string
): Promise<string | null> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  const { count } = await supabase
    .from('employers')
    .update({
      reset_token_hash: tokenHash,
      reset_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('email', normalizedEmail)
    .select('id', { count: 'exact', head: true });

  return count && count > 0 ? rawToken : null;
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new EmployerAuthError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      'weak_password'
    );
  }

  const supabase = getAdminClient();
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);
  const now = new Date().toISOString();

  const { count } = await supabase
    .from('employers')
    .update({
      password_hash: passwordHash,
      reset_token_hash: null,
      reset_token_expires_at: null,
      updated_at: now,
    })
    .eq('reset_token_hash', tokenHash)
    .gt('reset_token_expires_at', now)
    .select('id', { count: 'exact', head: true });

  return Boolean(count && count > 0);
}
