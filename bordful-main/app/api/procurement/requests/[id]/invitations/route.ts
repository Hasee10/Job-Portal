import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listInvitationsForRequest } from '@/lib/procurement/invitation-actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const invitations = await listInvitationsForRequest(session.user.id, id);
    return NextResponse.json({ invitations });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to load invitations.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
