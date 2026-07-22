import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type CareerGuide = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  category: string | null;
  publishedAt: string | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToGuide(row: Record<string, unknown>): CareerGuide {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    summary: (row.summary as string) || null,
    content: (row.content as string) || '',
    category: (row.category as string) || null,
    publishedAt: (row.published_at as string) || null,
  };
}

// The library is seeded by hand for now, there's no authoring UI yet -
// only published rows are ever shown publicly.
export async function listPublishedGuides(): Promise<CareerGuide[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('career_guides')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToGuide);
}

export async function getPublishedGuideBySlug(
  slug: string
): Promise<CareerGuide | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('career_guides')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToGuide(data) : null;
}
