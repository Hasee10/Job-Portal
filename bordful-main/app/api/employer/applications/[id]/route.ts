import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateApplicationStatus, type ApplicationStatus } from '@/lib/jobs/application-actions';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: ApplicationStatus[] = ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = body.status as ApplicationStatus;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  try {
    const application = await updateApplicationStatus(session.user.id, id, status);
    return NextResponse.json({ application });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update application.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
