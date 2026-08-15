import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listEvaluations, scoreResponse } from '@/lib/procurement/evaluation-actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const evaluations = await listEvaluations(session.user.id, id);
    return NextResponse.json({ evaluations });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to load evaluations.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const responseId = typeof body.responseId === 'string' ? body.responseId : '';
  const score = typeof body.score === 'number' ? body.score : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 4000) : null;
  if (!responseId) {
    return NextResponse.json({ error: 'responseId is required.' }, { status: 400 });
  }

  try {
    const evaluation = await scoreResponse(session.user.id, id, responseId, score, notes);
    return NextResponse.json({ evaluation });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to record evaluation.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
