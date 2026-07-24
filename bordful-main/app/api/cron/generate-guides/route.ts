import { NextResponse } from 'next/server';
import {
  archiveOldestPublishedGuidesOverCap,
} from '@/lib/content/guide-actions';
import { generateDraftGuides } from '@/lib/content/guide-generation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// New drafts per run - kept small since each one is a real AI call and
// every draft still needs a human to review and publish it.
const DRAFTS_PER_RUN = 2;

// Public library stays at this many *published* guides at most - the
// oldest gets archived (is_published=false, archived_at set) once a newer
// one is published, never deleted. Well above the current library size on
// purpose, so rotation only kicks in once the library has actually grown.
const PUBLISHED_GUIDE_CAP = 12;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const generation = await generateDraftGuides(DRAFTS_PER_RUN);
  const archivedIds = await archiveOldestPublishedGuidesOverCap(
    PUBLISHED_GUIDE_CAP
  );

  return NextResponse.json({
    ok: true,
    draftsCreated: generation.created,
    noUncoveredTopics: generation.skippedNoTopics,
    archivedCount: archivedIds.length,
  });
}
