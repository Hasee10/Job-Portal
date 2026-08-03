import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getEmployerDailyInviteCount,
  sendEmployerInvite,
} from '@/lib/jobs/employer-candidate-actions';
import { getEmployerById } from '@/lib/auth/employers';
import { sendEmail } from '@/lib/email/smtp';
import { renderEmployerInviteEmail } from '@/lib/email/templates/employer-invite';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const DAILY_INVITE_LIMIT = 20;
const isRateLimited = createRateLimiter(30);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const dailyCount = await getEmployerDailyInviteCount(session.user.id);
  if (dailyCount >= DAILY_INVITE_LIMIT) {
    return NextResponse.json(
      {
        error: `You've reached the daily limit of ${DAILY_INVITE_LIMIT} invites. Try again tomorrow.`,
        limitReached: true,
      },
      { status: 429 }
    );
  }

  const body = await request.json();
  const jobId = typeof body.jobId === 'string' ? body.jobId : '';
  const seekerId = typeof body.seekerId === 'string' ? body.seekerId : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';

  if (!jobId || !seekerId) {
    return NextResponse.json({ error: 'Job and candidate are required.' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  try {
    const invite = await sendEmployerInvite(session.user.id, jobId, seekerId, message);

    try {
      const employer = await getEmployerById(session.user.id);
      if (employer && body.seekerEmail) {
        const companyDisplay = employer.companyName || employer.email;
        const { subject, html } = renderEmployerInviteEmail({
          companyName: companyDisplay,
          jobTitle: typeof body.jobTitle === 'string' ? body.jobTitle : 'a role',
          message,
          inboxUrl: `${process.env.NEXTAUTH_URL ?? ''}/account/inbox`,
        });
        await sendEmail({ to: body.seekerEmail as string, subject, html });
      }
    } catch (emailErr) {
      console.error('[api/employer/invite] seeker notification email failed:', emailErr);
    }

    return NextResponse.json({ invite, remaining: DAILY_INVITE_LIMIT - dailyCount - 1 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send invite.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
