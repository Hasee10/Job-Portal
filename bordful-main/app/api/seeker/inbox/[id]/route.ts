import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { respondToOutreach, markOutreachRead } from '@/lib/jobs/candidate-outreach-actions';
import { getRecruiterAccountById } from '@/lib/auth/recruiter-accounts';
import { sendEmail } from '@/lib/email/smtp';

export const dynamic = 'force-dynamic';

function h(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
        const dashboardUrl = `${process.env.NEXTAUTH_URL ?? ''}/recruiter/pipeline`;
        await sendEmail({
          to: recruiter.email,
          subject: response === 'accepted'
            ? `${seekerDisplay} accepted your outreach`
            : `${seekerDisplay} declined your outreach`,
          html: buildRecruiterNotificationEmail({
            recruiterName: recruiter.name,
            seekerDisplay,
            response,
            dashboardUrl,
          }),
        });
      }
    } catch (err) {
      console.error('[api/seeker/inbox/[id]] recruiter notification email failed:', err);
    }

    return NextResponse.json({ outreach });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}

function buildRecruiterNotificationEmail({
  recruiterName,
  seekerDisplay,
  response,
  dashboardUrl,
}: {
  recruiterName: string;
  seekerDisplay: string;
  response: 'accepted' | 'declined';
  dashboardUrl: string;
}): string {
  const accepted = response === 'accepted';
  const accentColor = accepted ? '#16a34a' : '#71717a';
  const headline = accepted
    ? `${h(seekerDisplay)} accepted your connection request`
    : `${h(seekerDisplay)} declined your connection request`;
  const body = accepted
    ? `Great news — <strong>${h(seekerDisplay)}</strong> has accepted your outreach. You can now see their full profile and contact them directly from your pipeline.`
    : `<strong>${h(seekerDisplay)}</strong> has declined your outreach. This happens sometimes — keep building your pipeline and you&rsquo;ll find great candidates.`;

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:${accentColor};">${headline}</h2>
      <p style="color:#3f3f46;">${body}</p>
      <p>
        <a href="${h(dashboardUrl)}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
          View your pipeline
        </a>
      </p>
      <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">
        Hi ${h(recruiterName)}, you&rsquo;re receiving this because you sent an outreach message on ${h(process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '') ?? 'our platform')}.
      </p>
    </div>
  `;
}
