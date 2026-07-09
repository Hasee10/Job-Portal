import { NextResponse } from 'next/server';
import config from '@/config';
import { createPasswordResetToken } from '@/lib/auth/employers';
import { sendEmail } from '@/lib/email/resend';
import { renderPasswordResetEmail } from '@/lib/email/templates/password-reset';
import { EmailProviderError } from '@/lib/email/types';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const isRateLimited = createRateLimiter(5);

// Always the same generic message, regardless of whether the email is
// registered - the request always "succeeds" from the client's point of
// view so this endpoint can't be used to enumerate registered emails.
const GENERIC_RESPONSE = {
  success: true,
  message:
    "If an account exists for that email, we've sent a password reset link.",
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
    if (!email) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const token = await createPasswordResetToken(email);
    if (token) {
      const resetUrl = `${config.url}/reset-password?token=${token}`;
      try {
        const { subject, html } = renderPasswordResetEmail({ resetUrl });
        await sendEmail({ to: email, subject, html });
      } catch (error) {
        // Don't let a provider hiccup (or a not-yet-configured deployment)
        // leak into the response - the generic message goes out either way.
        console.error('[api/employers/forgot-password]', error);
      }
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    if (error instanceof EmailProviderError) {
      console.error('[api/employers/forgot-password]', error);
      return NextResponse.json(GENERIC_RESPONSE);
    }
    console.error('[api/employers/forgot-password]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
