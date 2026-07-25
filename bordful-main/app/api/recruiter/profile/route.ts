import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRecruiterAccountById, updateRecruiterProfile } from '@/lib/auth/recruiter-accounts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const recruiter = await getRecruiterAccountById(session.user.id);
  if (!recruiter) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ recruiter });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const patch: Parameters<typeof updateRecruiterProfile>[1] = {};

  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name;
  if ('agency' in body) patch.agency = typeof body.agency === 'string' ? body.agency : null;
  if (Array.isArray(body.specialties)) {
    patch.specialties = body.specialties.filter((s: unknown) => typeof s === 'string').slice(0, 20);
  }
  if ('linkedinUrl' in body) patch.linkedinUrl = typeof body.linkedinUrl === 'string' ? body.linkedinUrl : null;
  if ('bio' in body) patch.bio = typeof body.bio === 'string' ? body.bio.slice(0, 1000) : null;
  if ('website' in body) patch.website = typeof body.website === 'string' ? body.website : null;
  if ('industry' in body) patch.industry = typeof body.industry === 'string' ? body.industry : null;
  if ('companySize' in body) patch.companySize = typeof body.companySize === 'string' ? body.companySize : null;
  if ('location' in body) patch.location = typeof body.location === 'string' ? body.location : null;

  const recruiter = await updateRecruiterProfile(session.user.id, patch);
  return NextResponse.json({ recruiter });
}
