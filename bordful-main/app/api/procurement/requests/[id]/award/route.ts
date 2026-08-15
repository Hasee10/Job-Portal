import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { awardRequest } from '@/lib/procurement/evaluation-actions';
import { getRequestForBuyer } from '@/lib/procurement/request-actions';
import { listResponsesForRequest } from '@/lib/procurement/response-actions';
import { getVendorById } from '@/lib/procurement/vendor-actions';
import { sendEmail } from '@/lib/email/smtp';
import { renderProcurementAwardDecisionEmail } from '@/lib/email/templates/procurement-award-decision';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const responseId = typeof body.responseId === 'string' ? body.responseId : '';
  if (!responseId) {
    return NextResponse.json({ error: 'responseId is required.' }, { status: 400 });
  }

  try {
    await awardRequest(session.user.id, id, responseId);

    // Notify every vendor who responded - winner and non-winners alike.
    // Fire-and-catch so an email failure never undoes the award itself,
    // which has already been committed to the database at this point.
    try {
      const request = await getRequestForBuyer(session.user.id, id);
      const view = await listResponsesForRequest(session.user.id, id);
      if (request && !view.sealed) {
        for (const response of view.responses) {
          if (response.isWithdrawn) continue;
          const vendor = await getVendorById(response.vendorId);
          if (!vendor) continue;
          const { subject, html } = renderProcurementAwardDecisionEmail({
            requestTitle: request.title,
            won: response.id === responseId,
            dashboardUrl: `${process.env.NEXTAUTH_URL ?? ''}/procurement/vendor`,
          });
          await sendEmail({ to: vendor.email, subject, html });
        }
      }
    } catch (emailErr) {
      console.error('[api/procurement award] vendor notification email failed:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to award request.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
