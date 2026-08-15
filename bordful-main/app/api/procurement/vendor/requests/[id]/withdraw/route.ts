import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveVendorId } from '@/lib/procurement/vendor-actions';
import { withdrawResponse } from '@/lib/procurement/response-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const vendorId = await resolveVendorId(session);
  if (!vendorId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await params;
  try {
    await withdrawResponse(vendorId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to withdraw response.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
