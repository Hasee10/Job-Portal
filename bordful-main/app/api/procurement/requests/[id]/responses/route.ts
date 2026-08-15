import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listResponsesForRequest } from '@/lib/procurement/response-actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const view = await listResponsesForRequest(session.user.id, id);
    return NextResponse.json(view);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to load responses.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
