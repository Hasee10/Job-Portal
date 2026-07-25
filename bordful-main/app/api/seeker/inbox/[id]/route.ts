import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { respondToOutreach, markOutreachRead } from '@/lib/jobs/candidate-outreach-actions';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const action = body.action;

  if (action === 'read') {
    await markOutreachRead(id, session.user.id);
    return NextResponse.json({ success: true });
  }

  if (action === 'accept' || action === 'decline') {
    const outreach = await respondToOutreach(
      id,
      session.user.id,
      action === 'accept' ? 'accepted' : 'declined'
    );
    return NextResponse.json({ outreach });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
