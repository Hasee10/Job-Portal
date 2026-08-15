import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createRequest, listBuyerRequests } from '@/lib/procurement/request-actions';
import type { ProcurementType, ProcurementVisibility, SpecField } from '@/lib/procurement/request-actions';

export const dynamic = 'force-dynamic';

const VALID_TYPES: ProcurementType[] = ['rfi', 'rfq', 'rfp', 'tender'];
const VALID_VISIBILITY: ProcurementVisibility[] = ['open', 'invite_only'];

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const requests = await listBuyerRequests(session.user.id);
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const type = body.type as string;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const visibility = (body.visibility as string) || 'invite_only';
  const specFields: SpecField[] = Array.isArray(body.specFields) ? body.specFields : [];

  if (!VALID_TYPES.includes(type as ProcurementType)) {
    return NextResponse.json({ error: 'Invalid request type.' }, { status: 400 });
  }
  if (!VALID_VISIBILITY.includes(visibility as ProcurementVisibility)) {
    return NextResponse.json({ error: 'Invalid visibility.' }, { status: 400 });
  }
  if (!title || !description || !category) {
    return NextResponse.json({ error: 'Title, category, and description are required.' }, { status: 400 });
  }

  try {
    const created = await createRequest(session.user.id, {
      type: type as ProcurementType,
      category,
      title,
      description,
      specFields,
      visibility: visibility as ProcurementVisibility,
      sealedBids: Boolean(body.sealedBids),
      requiresPrequalification: Boolean(body.requiresPrequalification),
      responseDeadline: typeof body.responseDeadline === 'string' ? body.responseDeadline : null,
    });
    return NextResponse.json({ request: created });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create request.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
