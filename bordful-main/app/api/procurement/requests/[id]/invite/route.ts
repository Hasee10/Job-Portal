import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { inviteVendors } from '@/lib/procurement/invitation-actions';
import { getOrCreateVendorForRecruiterEmail, getVendorById } from '@/lib/procurement/vendor-actions';
import { getRequestForBuyer } from '@/lib/procurement/request-actions';
import { getEmployerById } from '@/lib/auth/employers';
import { sendEmail } from '@/lib/email/smtp';
import { renderProcurementInvitationEmail } from '@/lib/email/templates/procurement-invitation';

export const dynamic = 'force-dynamic';

// Buyer invites by the recruiter's Caliber email - resolved here against
// the real recruiter_accounts table (see getOrCreateVendorForRecruiterEmail)
// rather than requiring the buyer to already know an internal vendor id.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const emails = Array.isArray(body.vendorEmails)
    ? body.vendorEmails.filter((v: unknown) => typeof v === 'string')
    : [];
  if (emails.length === 0) {
    return NextResponse.json({ error: 'At least one vendor email is required.' }, { status: 400 });
  }

  const vendorIds: string[] = [];
  const notFound: string[] = [];
  for (const email of emails) {
    const vendor = await getOrCreateVendorForRecruiterEmail(email);
    if (vendor) vendorIds.push(vendor.id);
    else notFound.push(email);
  }

  if (vendorIds.length === 0) {
    return NextResponse.json(
      { error: `No Caliber recruiter account found for: ${notFound.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const invitations = await inviteVendors(session.user.id, id, vendorIds);

    // Notify each invited vendor - fire-and-catch so an email failure never
    // blocks the invitation itself.
    try {
      const [request, employer] = await Promise.all([
        getRequestForBuyer(session.user.id, id),
        getEmployerById(session.user.id),
      ]);
      if (request && employer) {
        for (const invitation of invitations) {
          const vendor = await getVendorById(invitation.vendorId);
          if (!vendor) continue;
          const { subject, html } = renderProcurementInvitationEmail({
            buyerCompanyName: employer.companyName || employer.email,
            requestTitle: request.title,
            requestType: request.type,
            responseDeadline: request.responseDeadline,
            requiresPrequalification: request.requiresPrequalification,
            respondUrl: `${process.env.NEXTAUTH_URL ?? ''}/procurement/vendor/requests/${id}`,
          });
          await sendEmail({ to: vendor.email, subject, html });
        }
      }
    } catch (emailErr) {
      console.error('[api/procurement invite] vendor notification email failed:', emailErr);
    }

    return NextResponse.json({ invitations, notFound });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to invite vendors.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
