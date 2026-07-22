import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  type ApplicationStatus,
  clearApplicationStatus,
  setApplicationStatus,
} from '@/lib/jobs/seeker-actions';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: ApplicationStatus[] = ['applied', 'not_interested'];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const jobId = typeof body.jobId === 'string' ? body.jobId : '';
  const status = body.status as ApplicationStatus;
  if (!jobId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'jobId and a valid status are required.' },
      { status: 400 }
    );
  }

  await setApplicationStatus(session.user.id, jobId, status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });
  }

  await clearApplicationStatus(session.user.id, jobId);
  return NextResponse.json({ ok: true });
}
