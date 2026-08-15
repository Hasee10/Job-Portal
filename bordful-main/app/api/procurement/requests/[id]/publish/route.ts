import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { publishRequest } from '@/lib/procurement/request-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const updated = await publishRequest(session.user.id, id);
    return NextResponse.json({ request: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to publish request.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
