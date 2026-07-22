import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createRecruiterRequest } from '@/lib/jobs/recruiter-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
  if (!message) {
    return NextResponse.json(
      { error: 'Please describe what you are looking for.' },
      { status: 400 }
    );
  }
  const recruiterId = typeof body.recruiterId === 'string' ? body.recruiterId : null;

  const result = await createRecruiterRequest(session.user.id, {
    recruiterId,
    message,
  });

  return NextResponse.json({ request: result });
}
