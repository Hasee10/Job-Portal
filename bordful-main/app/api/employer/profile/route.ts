import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getEmployerById, updateEmployerProfile } from '@/lib/auth/employers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const employer = await getEmployerById(session.user.id);
  if (!employer) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ employer });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const patch: Parameters<typeof updateEmployerProfile>[1] = {};

  if (typeof body.companyName === 'string' && body.companyName.trim()) {
    patch.companyName = body.companyName;
  }
  if ('website' in body) patch.website = typeof body.website === 'string' ? body.website : null;
  if ('industry' in body) patch.industry = typeof body.industry === 'string' ? body.industry : null;
  if ('companySize' in body) patch.companySize = typeof body.companySize === 'string' ? body.companySize : null;
  if ('location' in body) patch.location = typeof body.location === 'string' ? body.location : null;
  if ('description' in body) patch.description = typeof body.description === 'string' ? body.description : null;
  if ('logoUrl' in body) patch.logoUrl = typeof body.logoUrl === 'string' ? body.logoUrl : null;

  const employer = await updateEmployerProfile(session.user.id, patch);
  return NextResponse.json({ employer });
}
