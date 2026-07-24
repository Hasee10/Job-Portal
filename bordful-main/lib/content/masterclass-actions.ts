import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type Masterclass = {
  id: string;
  title: string;
  description: string | null;
  instructorName: string | null;
  instructorTitle: string | null;
  videoUrl: string | null;
  durationMinutes: number | null;
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

function rowToMasterclass(row: Record<string, unknown>): Masterclass {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || null,
    instructorName: (row.instructor_name as string) || null,
    instructorTitle: (row.instructor_title as string) || null,
    videoUrl: (row.video_url as string) || null,
    durationMinutes: (row.duration_minutes as number) || null,
    category: (row.category as string) || null,
    publishedAt: (row.published_at as string) || null,
  };
}

// Seeded by hand for now, same pattern as recruiters and career guides -
// no authoring UI yet, only published rows are shown publicly.
export async function listPublishedMasterclasses(): Promise<Masterclass[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('masterclasses')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToMasterclass);
}

// Every video_url ever stored, published or not - the discovery cron
// checks against this so it never proposes a video that's already in the
// library, whether live or still an unreviewed draft.
export async function listAllMasterclassVideoUrls(): Promise<Set<string>> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from('masterclasses').select('video_url');
  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((row) => row.video_url as string | null)
      .filter((url): url is string => Boolean(url))
  );
}

export type DraftMasterclassInput = {
  title: string;
  description: string | null;
  instructorName: string | null;
  instructorTitle: string | null;
  videoUrl: string;
  durationMinutes: number | null;
  category: string | null;
};

// Always inserted unpublished, same review-before-publish rule as draft
// career guides - a human flips is_published in the Supabase table editor.
export async function insertDraftMasterclass(
  input: DraftMasterclassInput
): Promise<Masterclass> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('masterclasses')
    .insert({
      title: input.title,
      description: input.description,
      instructor_name: input.instructorName,
      instructor_title: input.instructorTitle,
      video_url: input.videoUrl,
      duration_minutes: input.durationMinutes,
      category: input.category,
      is_published: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToMasterclass(data);
}
