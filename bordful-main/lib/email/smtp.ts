import nodemailer from 'nodemailer';
import { EmailProviderError } from './types';

// Gmail SMTP instead of a transactional provider (Resend/SendGrid/etc.) -
// those all restrict delivery to a verified custom domain, which costs
// money this project doesn't have. Gmail SMTP is free, requires no domain,
// and delivers to any recipient - the tradeoffs (mail shows as coming from
// a personal Gmail address, ~500 sends/day cap, more likely to land in
// spam without custom-domain SPF/DKIM) are acceptable for an early-stage
// product. Swap this file's internals again later if/when a real domain
// is available; every call site just imports sendEmail() from here.
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null =
  null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return cachedTransporter;
}

function assertConfigured(featureLabel: string): boolean {
  if (getTransporter()) return false;

  if (process.env.NODE_ENV === 'development') {
    return true; // simulate success locally without credentials
  }

  console.error(
    `[email/smtp] GMAIL_USER / GMAIL_APP_PASSWORD is not set - ${featureLabel} ` +
      'is failing. Set both in the deployment environment (a free Gmail ' +
      'App Password, not your regular password - generate one at ' +
      'myaccount.google.com/apppasswords).'
  );
  throw new EmailProviderError(
    'Gmail SMTP credentials are required in production',
    'smtp',
    true
  );
}

export async function sendEmail(data: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (assertConfigured(`"${data.subject}" email`)) {
      return { success: true };
    }

    const transporter = getTransporter();
    if (!transporter) {
      // Unreachable in practice (assertConfigured already threw above when
      // credentials are missing outside development), but keeps this
      // function's control flow provably safe for TypeScript.
      throw new EmailProviderError('Gmail SMTP is not configured', 'smtp', true);
    }

    await transporter.sendMail({
      from: `JobLo <${process.env.GMAIL_USER}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof EmailProviderError) {
      throw error;
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send email';
    throw new EmailProviderError(errorMessage, 'smtp');
  }
}
