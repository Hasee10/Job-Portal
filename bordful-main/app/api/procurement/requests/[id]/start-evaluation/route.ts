import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { startEvaluation } from '@/lib/procurement/evaluation-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await startEvaluation(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start evaluation.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
