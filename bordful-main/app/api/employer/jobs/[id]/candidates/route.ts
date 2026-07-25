import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { searchCandidatesForJob } from '@/lib/jobs/employer-candidate-actions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const searchTerm = new URL(request.url).searchParams.get('q') || undefined;
  const candidates = await searchCandidatesForJob(session.user.id, id, { searchTerm });
  return NextResponse.json({ candidates });
}
