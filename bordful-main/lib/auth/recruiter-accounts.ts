import 'server-only';

import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const BCRYPT_COST_FACTOR = 12;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export type RecruiterAccount = {
  id: string;
  email: string;
  name: string;
  agency: string | null;
  specialties: string[];
  linkedinUrl: string | null;
  bio: string | null;
  isVerified: boolean;
};

export class RecruiterAuthError extends Error {
  constructor(
    message: string,
    public code: 'invalid_email' | 'weak_password' | 'email_taken' | 'invalid_credentials' | 'db_unavailable'
  ) {
    super(message);
    this.name = 'RecruiterAuthError';
  }
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new RecruiterAuthError(
      'Database is not configured on this deployment.',
      'db_unavailable'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function rowToRecruiterAccount(row: Record<string, unknown>): RecruiterAccount {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    agency: (row.agency as string) || null,
    specialties: (row.specialties as string[]) || [],
    linkedinUrl: (row.linkedin_url as string) || null,
    bio: (row.bio as string) || null,
    isVerified: Boolean(row.is_verified),
  };
}

export async function createRecruiterAccount(
  email: string,
  password: string,
  name: string,
  agency?: string
): Promise<RecruiterAccount> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new RecruiterAuthError('Enter a valid email address.', 'invalid_email');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new RecruiterAuthError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      'weak_password'
    );
  }
  if (!name.trim()) {
    throw new RecruiterAuthError('Name is required.', 'invalid_credentials');
  }

  const supabase = getAdminClient();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  const { data, error } = await supabase
    .from('recruiter_accounts')
    .insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      name: name.trim(),
      agency: agency?.trim() || null,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new RecruiterAuthError(
        'An account with this email already exists.',
        'email_taken'
      );
    }
    throw error;
  }

  return rowToRecruiterAccount(data);
}

export async function verifyRecruiterCredentials(
  email: string,
  password: string
): Promise<RecruiterAccount | null> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data } = await supabase
    .from('recruiter_accounts')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!data) {
    await bcrypt.compare(password, '$2a$12$' + 'a'.repeat(53));
    return null;
  }

  const valid = await bcrypt.compare(password, data.password_hash as string);
  if (!valid) return null;

  return rowToRecruiterAccount(data);
}

export async function getRecruiterAccountById(
  id: string
): Promise<RecruiterAccount | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('recruiter_accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToRecruiterAccount(data) : null;
}

export async function updateRecruiterProfile(
  id: string,
  input: {
    name?: string;
    agency?: string | null;
    specialties?: string[];
    linkedinUrl?: string | null;
    bio?: string | null;
  }
): Promise<RecruiterAccount> {
  const supabase = getAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.agency !== undefined) patch.agency = input.agency?.trim() || null;
  if (input.specialties !== undefined) patch.specialties = input.specialties;
  if (input.linkedinUrl !== undefined) patch.linkedin_url = input.linkedinUrl?.trim() || null;
  if (input.bio !== undefined) patch.bio = input.bio?.trim() || null;

  const { data, error } = await supabase
    .from('recruiter_accounts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToRecruiterAccount(data);
}

export async function createRecruiterPasswordResetToken(
  email: string
): Promise<string | null> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  const { data } = await supabase
    .from('recruiter_accounts')
    .update({
      reset_token_hash: tokenHash,
      reset_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('email', normalizedEmail)
    .select('id');

  return data && data.length > 0 ? rawToken : null;
}

export async function resetRecruiterPasswordWithToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new RecruiterAuthError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      'weak_password'
    );
  }

  const supabase = getAdminClient();
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);
  const now = new Date().toISOString();

  const { data } = await supabase
    .from('recruiter_accounts')
    .update({
      password_hash: passwordHash,
      reset_token_hash: null,
      reset_token_expires_at: null,
      updated_at: now,
    })
    .eq('reset_token_hash', tokenHash)
    .gt('reset_token_expires_at', now)
    .select('id');

  return Boolean(data && data.length > 0);
}
