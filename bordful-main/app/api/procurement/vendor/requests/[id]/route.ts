import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveVendorId } from '@/lib/procurement/vendor-actions';
import { getRequestById } from '@/lib/procurement/request-actions';
import { getVendorInvitation, markInvitationViewed } from '@/lib/procurement/invitation-actions';
import { getMyResponse } from '@/lib/procurement/response-actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const vendorId = await resolveVendorId(session);
  if (!vendorId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await params;
  const found = await getRequestById(id);
  if (!found) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

  const invitation = await getVendorInvitation(vendorId, id);
  if (found.visibility === 'invite_only' && !invitation) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (invitation) await markInvitationViewed(vendorId, id);

  const myResponse = await getMyResponse(vendorId, id);
  return NextResponse.json({ request: found, invitation, myResponse });
}
