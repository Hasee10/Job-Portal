import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendOutreach, listRecruiterOutreach } from '@/lib/jobs/candidate-outreach-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const outreach = await listRecruiterOutreach(session.user.id);
  return NextResponse.json({ outreach });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const seekerId = typeof body.seekerId === 'string' ? body.seekerId : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';

  if (!seekerId) {
    return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  try {
    const outreach = await sendOutreach(session.user.id, seekerId, message);
    return NextResponse.json({ outreach });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send outreach.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
