import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteSavedSearch } from '@/lib/jobs/saved-search-actions';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  await deleteSavedSearch(session.user.id, id);
  return NextResponse.json({ ok: true });
}
