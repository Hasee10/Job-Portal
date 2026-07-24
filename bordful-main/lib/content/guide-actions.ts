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
  archivedAt: string | null;
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
    archivedAt: (row.archived_at as string) || null,
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

// Every slug/title ever used, published or not - the monthly generation
// cron checks against this so it never proposes a topic that's already a
// live guide, a pending draft, or a previously archived one.
export async function listAllGuideSlugs(): Promise<Set<string>> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from('career_guides').select('slug');
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.slug as string));
}

// Few-shot examples for the generation prompt - pulled live from whatever
// is actually published right now (including anything you've hand-edited)
// rather than a hardcoded snapshot that would drift out of sync with the
// site's real voice over time.
export async function listPublishedGuidesForStyleReference(
  limit: number
): Promise<CareerGuide[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('career_guides')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(rowToGuide);
}

export type DraftGuideInput = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
};

// Always inserted unpublished - a human has to flip is_published to true
// (currently via the Supabase table editor; there's no authoring UI yet)
// before an AI-generated guide is visible to anyone.
export async function insertDraftGuide(
  input: DraftGuideInput
): Promise<CareerGuide> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('career_guides')
    .insert({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      content: input.content,
      category: input.category,
      is_published: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToGuide(data);
}

// Keeps the public library at a bounded size: once more than `cap` guides
// are published, the oldest ones (by published_at) get archived - is_
// published flips back to false and archived_at is stamped, but the row
// is never deleted. That keeps URLs alive and leaves a valid reference for
// any future read-history/streak feature, instead of a hard delete that
// would orphan it.
export async function archiveOldestPublishedGuidesOverCap(
  cap: number
): Promise<string[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('career_guides')
    .select('id, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) throw error;

  const overCap = (data ?? []).slice(cap);
  if (overCap.length === 0) return [];

  const idsToArchive = overCap.map((row) => row.id as string);
  const { error: archiveError } = await supabase
    .from('career_guides')
    .update({ is_published: false, archived_at: new Date().toISOString() })
    .in('id', idsToArchive);

  if (archiveError) throw archiveError;
  return idsToArchive;
}
