import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveVendorId } from '@/lib/procurement/vendor-actions';
import { submitResponse } from '@/lib/procurement/response-actions';
import { getRequestById } from '@/lib/procurement/request-actions';
import { getEmployerById } from '@/lib/auth/employers';
import { sendEmail } from '@/lib/email/smtp';
import { renderProcurementResponseReceivedEmail } from '@/lib/email/templates/procurement-response-received';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const vendorId = await resolveVendorId(session);
  if (!vendorId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const proposalText = typeof body.proposalText === 'string' ? body.proposalText.trim().slice(0, 10000) : null;
  const proposalDocumentPath = typeof body.proposalDocumentPath === 'string' ? body.proposalDocumentPath : null;
  const pricing =
    body.pricing && typeof body.pricing === 'object' ? (body.pricing as Record<string, unknown>) : null;

  try {
    const response = await submitResponse(vendorId, id, { pricing, proposalText, proposalDocumentPath });

    try {
      const request = await getRequestById(id);
      const employer = request ? await getEmployerById(request.buyerId) : null;
      if (request && employer) {
        const { subject, html } = renderProcurementResponseReceivedEmail({
          requestTitle: request.title,
          sealedBids: request.sealedBids,
          requestUrl: `${process.env.NEXTAUTH_URL ?? ''}/procurement/requests/${id}`,
        });
        await sendEmail({ to: employer.email, subject, html });
      }
    } catch (emailErr) {
      console.error('[api/procurement respond] buyer notification email failed:', emailErr);
    }

    return NextResponse.json({ response });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to submit response.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
