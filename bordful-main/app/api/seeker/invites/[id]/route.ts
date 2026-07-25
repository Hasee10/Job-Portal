import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { markInviteRead, respondToInvite } from '@/lib/jobs/employer-candidate-actions';

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
    await markInviteRead(id, session.user.id);
    return NextResponse.json({ success: true });
  }

  if (action === 'accept' || action === 'decline') {
    const invite = await respondToInvite(id, session.user.id, action === 'accept' ? 'accepted' : 'declined');
    return NextResponse.json({ invite });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
