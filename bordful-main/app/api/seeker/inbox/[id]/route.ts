import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { respondToOutreach, markOutreachRead } from '@/lib/jobs/candidate-outreach-actions';
import { getRecruiterAccountById } from '@/lib/auth/recruiter-accounts';
import { getJob } from '@/lib/db/airtable.server';
import { sendEmail } from '@/lib/email/smtp';
import { renderOutreachResponseEmail } from '@/lib/email/templates/outreach-response';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const action = body.action;

  if (action === 'read') {
    await markOutreachRead(id, session.user.id);
    return NextResponse.json({ success: true });
  }

  if (action === 'accept' || action === 'decline') {
    const response = action === 'accept' ? 'accepted' : 'declined';
    const outreach = await respondToOutreach(id, session.user.id, response);

    // Notify the recruiter — fire-and-catch so email failure never blocks the response.
    try {
      const recruiter = await getRecruiterAccountById(outreach.recruiterId);
      if (recruiter) {
        const seekerDisplay = session.user.name || session.user.email || 'A candidate';
        const job = outreach.jobId ? await getJob(outreach.jobId) : null;
        const { subject, html } = renderOutreachResponseEmail({
          seekerDisplay,
          response,
          jobTitle: job?.title ?? null,
          dashboardUrl: `${process.env.NEXTAUTH_URL ?? ''}/recruiter/pipeline`,
        });
        await sendEmail({ to: recruiter.email, subject, html });
      }
    } catch (err) {
      console.error('[api/seeker/inbox/[id]] recruiter notification email failed:', err);
    }

    return NextResponse.json({ outreach });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
