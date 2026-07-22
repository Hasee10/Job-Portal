import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSeekerJobState } from '@/lib/jobs/seeker-actions';

export const dynamic = 'force-dynamic';

// Single hydration call for the whole page - job cards and the account
// page both need "is this job saved / applied" for many jobs at once,
// so the client fetches this once instead of per-card.
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ savedJobIds: [], applications: {} });
  }

  const state = await getSeekerJobState(session.user.id);
  return NextResponse.json(state);
}
