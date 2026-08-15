import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRequestForBuyer } from '@/lib/procurement/request-actions';
import { listAuditLog } from '@/lib/procurement/audit-actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const found = await getRequestForBuyer(session.user.id, id);
  if (!found) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

  const entries = await listAuditLog(id);
  return NextResponse.json({ entries });
}
