import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveVendorId } from '@/lib/procurement/vendor-actions';
import { uploadProposalDocument, getSignedDownloadUrl } from '@/lib/procurement/document-actions';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const isRateLimited = createRateLimiter(10);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const vendorId = await resolveVendorId(session);
  if (!vendorId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }

  try {
    const path = await uploadProposalDocument(vendorId, id, file);
    return NextResponse.json({ path });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to upload document.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const vendorId = await resolveVendorId(session);
  if (!vendorId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path is required.' }, { status: 400 });

  try {
    const url = await getSignedDownloadUrl(vendorId, 'vendor', id, path);
    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate download link.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
