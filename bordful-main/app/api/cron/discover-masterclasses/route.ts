import { NextResponse } from 'next/server';
import { discoverNewMasterclasses } from '@/lib/content/masterclass-discovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await discoverNewMasterclasses();

  if (result.notConfigured) {
    return NextResponse.json(
      {
        error:
          'YOUTUBE_API_KEY is not set - masterclass discovery is not available on this deployment.',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, draftsCreated: result.created });
}
