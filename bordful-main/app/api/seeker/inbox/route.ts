import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listSeekerInbox } from '@/lib/jobs/candidate-outreach-actions';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const inbox = await listSeekerInbox(session.user.id);
  return NextResponse.json({ inbox });
}

// Toggle open_to_recruiters and/or update headline
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.openToRecruiters === 'boolean') {
    patch.open_to_recruiters = body.openToRecruiters;
  }
  if ('headline' in body) {
    const h = typeof body.headline === 'string' ? body.headline.trim().slice(0, 160) : null;
    patch.headline = h || null;
  }

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from('job_seekers')
    .update(patch)
    .eq('id', session.user.id);

  if (error) {
    console.error('[api/seeker/inbox PATCH]', error);
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...('openToRecruiters' in body && { openToRecruiters: body.openToRecruiters }) });
}
