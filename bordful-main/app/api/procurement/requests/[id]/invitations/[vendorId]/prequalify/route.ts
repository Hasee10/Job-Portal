import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { setPrequalificationDecision } from '@/lib/procurement/invitation-actions';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id, vendorId } = await params;
  const body = await request.json();
  const decision = body.decision as string;
  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ error: 'decision must be "approved" or "rejected".' }, { status: 400 });
  }

  try {
    const invitation = await setPrequalificationDecision(session.user.id, id, vendorId, decision);
    return NextResponse.json({ invitation });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to record decision.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
