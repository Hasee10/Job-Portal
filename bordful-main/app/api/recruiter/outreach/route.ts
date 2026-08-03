import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  sendOutreach,
  listRecruiterOutreach,
  getRecruiterDailyOutreachCount,
} from '@/lib/jobs/candidate-outreach-actions';
import { getRecruiterAccountById } from '@/lib/auth/recruiter-accounts';
import { sendEmail } from '@/lib/email/smtp';
import { renderRecruiterOutreachEmail } from '@/lib/email/templates/recruiter-outreach';
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
  const jobId = typeof body.jobId === 'string' ? body.jobId : null;
  const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle : null;

  if (!seekerId) {
    return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  try {
    const outreach = await sendOutreach(session.user.id, seekerId, message, jobId);

    // Notify the seeker by email — fire-and-catch so an email failure
    // never blocks the outreach from being recorded.
    try {
      const recruiter = await getRecruiterAccountById(session.user.id);
      if (recruiter && body.seekerEmail) {
        const { subject, html } = renderRecruiterOutreachEmail({
          recruiterName: recruiter.name,
          recruiterAgency: recruiter.agency,
          message,
          jobTitle,
          inboxUrl: `${process.env.NEXTAUTH_URL ?? ''}/account/inbox`,
        });
        await sendEmail({ to: body.seekerEmail as string, subject, html });
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

