import { NextResponse } from 'next/server';
import config from '@/config';
import { createRecruiterPasswordResetToken } from '@/lib/auth/recruiter-accounts';
import { sendEmail } from '@/lib/email/smtp';
import { renderPasswordResetEmail } from '@/lib/email/templates/password-reset';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const isRateLimited = createRateLimiter(5);

const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists for that email, we've sent a password reset link.",
};

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email : '';
    if (!email) return NextResponse.json(GENERIC_RESPONSE);

    const token = await createRecruiterPasswordResetToken(email);
    if (token) {
      const resetUrl = `${config.url}/recruiter/reset-password?token=${token}`;
      try {
        const { subject, html } = renderPasswordResetEmail({ resetUrl });
        await sendEmail({ to: email, subject, html });
      } catch (error) {
        console.error('[api/recruiters/forgot-password]', error);
      }
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('[api/recruiters/forgot-password]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
