import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listOptInCandidates } from '@/lib/jobs/candidate-outreach-actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q') || undefined;
  const skillsParam = searchParams.get('skills');
  const skills = skillsParam ? skillsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

  const candidates = await listOptInCandidates(session.user.id, { skills, searchTerm });
  return NextResponse.json({ candidates });
}
