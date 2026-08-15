import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Session } from 'next-auth';

export type VendorAccount = {
  id: string;
  recruiterId: string | null;
  email: string;
  companyName: string | null;
  categories: string[];
  website: string | null;
  industry: string | null;
  companySize: string | null;
  location: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Supabase/PostgREST errors are plain objects, not `instanceof Error` - see
// the identical comment in lib/jobs/application-actions.ts for why this
// wrapping matters.
function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  const message = (error as { message?: string } | null)?.message;
  return new Error(message || fallback);
}

function rowToVendor(row: Record<string, unknown>): VendorAccount {
  return {
    id: row.id as string,
    recruiterId: (row.recruiter_id as string) || null,
    email: row.email as string,
    companyName: (row.company_name as string) || null,
    categories: (row.categories as string[]) || [],
    website: (row.website as string) || null,
    industry: (row.industry as string) || null,
    companySize: (row.company_size as string) || null,
    location: (row.location as string) || null,
    isVerified: Boolean(row.is_verified),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// A recruiter can act as a vendor with no separate signup - vendor_accounts
// is deliberately category-agnostic (proc.md §4.3) so non-recruiter vendor
// types can be added later without a schema change, but Phase 1 only ever
// populates this table via this recruiter-linked path. Idempotent: the
// unique constraint on recruiter_id means a second call for the same
// recruiter just returns the existing row.
export async function getOrCreateVendorForRecruiter(
  recruiterId: string,
  recruiterEmail: string,
  recruiterName: string
): Promise<VendorAccount> {
  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from('vendor_accounts')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .maybeSingle();

  if (existing) return rowToVendor(existing);

  const { data, error } = await supabase
    .from('vendor_accounts')
    .insert({
      recruiter_id: recruiterId,
      email: recruiterEmail,
      company_name: recruiterName,
      categories: ['staffing'],
    })
    .select('*')
    .single();

  if (error) {
    // Race: another request created it between the select and insert above.
    if (error.code === '23505') {
      const { data: raced } = await supabase
        .from('vendor_accounts')
        .select('*')
        .eq('recruiter_id', recruiterId)
        .single();
      if (raced) return rowToVendor(raced);
    }
    throw toError(error, 'Failed to set up vendor profile.');
  }

  return rowToVendor(data);
}

// Lets a buyer invite a recruiter who has never touched procurement before -
// they type the recruiter's Caliber email, we resolve it against the real
// recruiter_accounts table (never an arbitrary address, matching the
// Caliber-registered-only decision) and provision the vendor identity on
// first contact instead of requiring the recruiter to visit /procurement
// first just to become inviteable.
export async function getOrCreateVendorForRecruiterEmail(
  email: string
): Promise<VendorAccount | null> {
  const supabase = getAdminClient();
  const { data: recruiter } = await supabase
    .from('recruiter_accounts')
    .select('id, email, name')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!recruiter) return null;
  return getOrCreateVendorForRecruiter(
    recruiter.id as string,
    recruiter.email as string,
    recruiter.name as string
  );
}

export async function getVendorById(vendorId: string): Promise<VendorAccount | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('vendor_accounts')
    .select('*')
    .eq('id', vendorId)
    .maybeSingle();
  return data ? rowToVendor(data) : null;
}

// Resolves the calling session to a vendor_accounts id. Only 'recruiter' is
// wired up in Phase 1 - standalone (non-recruiter) vendor login isn't built
// yet, so a 'vendor' role never actually occurs today, but the branch is
// left in place since the schema and session shape already support it.
export async function resolveVendorId(session: Session | null): Promise<string | null> {
  if (!session?.user) return null;

  if (session.user.role === 'recruiter') {
    const vendor = await getOrCreateVendorForRecruiter(
      session.user.id,
      session.user.email ?? '',
      session.user.name ?? 'Recruiter'
    );
    return vendor.id;
  }

  if (session.user.role === 'vendor') {
    return session.user.id;
  }

  return null;
}
