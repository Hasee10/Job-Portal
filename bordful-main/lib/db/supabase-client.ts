import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!globalThis.__supabaseClient) {
    globalThis.__supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return globalThis.__supabaseClient;
}
