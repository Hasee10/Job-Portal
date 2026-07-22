import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { saveJob, unsaveJob } from '@/lib/jobs/seeker-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const jobId = typeof body.jobId === 'string' ? body.jobId : '';
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });
  }

  await saveJob(session.user.id, jobId);
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

  await unsaveJob(session.user.id, jobId);
  return NextResponse.json({ ok: true });
}
