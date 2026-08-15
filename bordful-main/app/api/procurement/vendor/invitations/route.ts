import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveVendorId } from '@/lib/procurement/vendor-actions';
import { listVendorInvitations } from '@/lib/procurement/invitation-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const vendorId = await resolveVendorId(session);
  if (!vendorId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const invitations = await listVendorInvitations(vendorId);
  return NextResponse.json({ invitations });
}
