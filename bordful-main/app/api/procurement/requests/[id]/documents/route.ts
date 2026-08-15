import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSignedDownloadUrl } from '@/lib/procurement/document-actions';

export const dynamic = 'force-dynamic';

// Buyer-side signed download URL for a proposal document. Sealed-bid
// enforcement and ownership verification both happen inside
// getSignedDownloadUrl - this route just resolves the session and delegates.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path is required.' }, { status: 400 });

  try {
    const url = await getSignedDownloadUrl(session.user.id, 'employer', id, path);
    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate download link.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
