import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  sendOutreach,
  listRecruiterOutreach,
  getRecruiterDailyOutreachCount,
} from '@/lib/jobs/candidate-outreach-actions';
import { getRecruiterAccountById } from '@/lib/auth/recruiter-accounts';
import { sendEmail } from '@/lib/email/smtp';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const DAILY_OUTREACH_LIMIT = 20;

const isRateLimited = createRateLimiter(30);

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const outreach = await listRecruiterOutreach(session.user.id);
  return NextResponse.json({ outreach });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Enforce per-recruiter daily send cap
  const dailyCount = await getRecruiterDailyOutreachCount(session.user.id);
  if (dailyCount >= DAILY_OUTREACH_LIMIT) {
    return NextResponse.json(
      {
        error: `You've reached the daily limit of ${DAILY_OUTREACH_LIMIT} outreach messages. Try again tomorrow.`,
        limitReached: true,
      },
      { status: 429 }
    );
  }

  const body = await request.json();
  const seekerId = typeof body.seekerId === 'string' ? body.seekerId : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';

  if (!seekerId) {
    return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  try {
    const outreach = await sendOutreach(session.user.id, seekerId, message);

    // Notify the seeker by email — fire-and-catch so an email failure
    // never blocks the outreach from being recorded.
    try {
      const recruiter = await getRecruiterAccountById(session.user.id);
      if (recruiter && body.seekerEmail) {
        const recruiterDisplay = recruiter.agency
          ? `${recruiter.name} at ${recruiter.agency}`
          : recruiter.name;
        await sendEmail({
          to: body.seekerEmail as string,
          subject: `${recruiterDisplay} wants to connect with you`,
          html: buildSeekerNotificationEmail({
            recruiterName: recruiter.name,
            recruiterAgency: recruiter.agency,
            message,
            inboxUrl: `${process.env.NEXTAUTH_URL ?? ''}/account/inbox`,
          }),
        });
      }
    } catch (emailErr) {
      console.error('[api/recruiter/outreach] seeker notification email failed:', emailErr);
    }

    return NextResponse.json({ outreach, remaining: DAILY_OUTREACH_LIMIT - dailyCount - 1 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send outreach.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

function h(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSeekerNotificationEmail({
  recruiterName,
  recruiterAgency,
  message,
  inboxUrl,
}: {
  recruiterName: string;
  recruiterAgency: string | null;
  message: string;
  inboxUrl: string;
}): string {
  const from = recruiterAgency
    ? `${h(recruiterName)} at ${h(recruiterAgency)}`
    : h(recruiterName);
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#18181b;">You have a new recruiter message</h2>
      <p style="color:#71717a;">${from} found your profile and sent you a message.</p>
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
        You can turn it off at any time from your <a href="${h(inboxUrl)}" style="color:#a1a1aa;">inbox settings</a>.
      </p>
    </div>
  `;
}
