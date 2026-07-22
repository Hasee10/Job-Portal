import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type Testimonial = {
  id: string;
  quote: string;
  authorName: string;
  authorTitle: string | null;
  authorCompany: string | null;
  avatarUrl: string | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToTestimonial(row: Record<string, unknown>): Testimonial {
  return {
    id: row.id as string,
    quote: row.quote as string,
    authorName: row.author_name as string,
    authorTitle: (row.author_title as string) || null,
    authorCompany: (row.author_company as string) || null,
    avatarUrl: (row.avatar_url as string) || null,
  };
}

// Seeded by hand for now, same pattern as recruiters/guides/masterclasses -
// no authoring UI yet, only published rows are shown publicly.
export async function listPublishedTestimonials(): Promise<Testimonial[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToTestimonial);
}
