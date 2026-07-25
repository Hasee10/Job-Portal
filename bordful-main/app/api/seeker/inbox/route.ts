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

// Toggle open_to_recruiters
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  if (typeof body.openToRecruiters !== 'boolean') {
    return NextResponse.json({ error: 'openToRecruiters must be a boolean.' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from('job_seekers')
    .update({ open_to_recruiters: body.openToRecruiters, updated_at: new Date().toISOString() })
    .eq('id', session.user.id);

  if (error) {
    console.error('[api/seeker/inbox PATCH]', error);
    return NextResponse.json({ error: 'Failed to update preference.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, openToRecruiters: body.openToRecruiters });
}
