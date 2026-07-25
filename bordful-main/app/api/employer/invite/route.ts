import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getEmployerDailyInviteCount,
  sendEmployerInvite,
} from '@/lib/jobs/employer-candidate-actions';
import { getEmployerById } from '@/lib/auth/employers';
import { sendEmail } from '@/lib/email/smtp';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const DAILY_INVITE_LIMIT = 20;
const isRateLimited = createRateLimiter(30);

function h(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
        await sendEmail({
          to: body.seekerEmail as string,
          subject: `${companyDisplay} invited you to apply`,
          html: buildInviteEmail({
            companyName: companyDisplay,
            jobTitle: typeof body.jobTitle === 'string' ? body.jobTitle : 'a role',
            message,
            inboxUrl: `${process.env.NEXTAUTH_URL ?? ''}/account/inbox`,
          }),
        });
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

function buildInviteEmail({
  companyName,
  jobTitle,
  message,
  inboxUrl,
}: {
  companyName: string;
  jobTitle: string;
  message: string;
  inboxUrl: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#18181b;">${h(companyName)} invited you to apply for ${h(jobTitle)}</h2>
      <blockquote style="border-left:3px solid #e4e4e7;margin:16px 0;padding:12px 16px;color:#3f3f46;font-style:italic;">
        ${h(message)}
      </blockquote>
      <p>
        <a href="${h(inboxUrl)}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
          View in inbox
        </a>
      </p>
      <p style="color:#a1a1aa;font-size:12px;">
        You&rsquo;re receiving this because you enabled recruiter visibility on your account.
      </p>
    </div>
  `;
}
