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
  website: string | null;
  logoUrl: string | null;
  industry: string | null;
  companySize: string | null;
  location: string | null;
  description: string | null;
};

const PROFILE_COLUMNS =
  'id, email, company_name, website, logo_url, industry, company_size, location, description';

function rowToEmployer(row: Record<string, unknown>): Employer {
  return {
    id: row.id as string,
    email: row.email as string,
    companyName: (row.company_name as string) || null,
    website: (row.website as string) || null,
    logoUrl: (row.logo_url as string) || null,
    industry: (row.industry as string) || null,
    companySize: (row.company_size as string) || null,
    location: (row.location as string) || null,
    description: (row.description as string) || null,
  };
}

// Derives a company logo from a website URL via Clearbit's free, keyless
// logo API - this is the "auto-picked" logo the employer can still override.
export function deriveLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const domain = new URL(url).hostname.replace(/^www\./, '');
    return domain ? `https://logo.clearbit.com/${domain}` : null;
  } catch {
    return null;
  }
}

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
    .select(PROFILE_COLUMNS)
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

  return rowToEmployer(data);
}

export async function verifyEmployerCredentials(
  email: string,
  password: string
): Promise<Employer | null> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data } = await supabase
    .from('employers')
    .select(`${PROFILE_COLUMNS}, password_hash`)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!data) {
    // Constant-time dummy compare so timing can't reveal "email not found"
    await bcrypt.compare(password, '$2a$12$' + 'a'.repeat(53));
    return null;
  }

  const valid = await bcrypt.compare(password, data.password_hash as string);
  if (!valid) return null;

  return rowToEmployer(data);
}

export async function getEmployerById(id: string): Promise<Employer | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('employers')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToEmployer(data) : null;
}

export async function updateEmployerProfile(
  id: string,
  input: {
    companyName?: string;
    website?: string | null;
    industry?: string | null;
    companySize?: string | null;
    location?: string | null;
    description?: string | null;
    logoUrl?: string | null;
  }
): Promise<Employer> {
  const supabase = getAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.companyName !== undefined) patch.company_name = input.companyName.trim();
  if (input.website !== undefined) patch.website = input.website?.trim() || null;
  if (input.industry !== undefined) patch.industry = input.industry?.trim() || null;
  if (input.companySize !== undefined) patch.company_size = input.companySize?.trim() || null;
  if (input.location !== undefined) patch.location = input.location?.trim() || null;
  if (input.description !== undefined) patch.description = input.description?.trim().slice(0, 1000) || null;
  // Auto-derive the logo from the website unless the caller explicitly overrides it.
  if (input.logoUrl !== undefined) {
    patch.logo_url = input.logoUrl?.trim() || null;
  } else if (input.website !== undefined) {
    patch.logo_url = deriveLogoUrl(input.website);
  }

  const { data, error } = await supabase
    .from('employers')
    .update(patch)
    .eq('id', id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return rowToEmployer(data);
}

export async function createPasswordResetToken(
  email: string
): Promise<string | null> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  const { data } = await supabase
    .from('employers')
    .update({
      reset_token_hash: tokenHash,
      reset_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('email', normalizedEmail)
    .select('id');

  return data && data.length > 0 ? rawToken : null;
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

  const { data } = await supabase
    .from('employers')
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
