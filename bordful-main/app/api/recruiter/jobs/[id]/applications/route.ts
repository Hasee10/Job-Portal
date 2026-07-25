import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listJobApplications } from '@/lib/jobs/application-actions';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const applications = await listJobApplications({ recruiterId: session.user.id }, id);
  return NextResponse.json({ applications });
}
