import axios from 'axios';
import { EmailProviderError } from './types';

// Resend (resend.com) has a genuinely free tier - 3,000 emails/month,
// 100/day, no credit card required - unlike Encharge which needs a paid
// plan to actually deliver anything. Used only for the transactional
// emails we fully control the HTML for (welcome, password reset, purchase
// confirmation) - Encharge is still used for job-alert subscriptions,
// which relies on its own tagging/automation system, not a direct send.
const RESEND_API_URL = 'https://api.resend.com/emails';

// resend.dev is Resend's built-in sandbox sender - works out of the box
// with no domain verification, but only for testing. Once a real domain is
// verified in the Resend dashboard, set RESEND_FROM_EMAIL to send from it.
const DEFAULT_FROM = 'JobLo <onboarding@resend.dev>';

function assertConfigured(featureLabel: string): boolean {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey && process.env.NODE_ENV === 'development') {
    return true; // simulate success locally without a key
  }
  if (!apiKey) {
    console.error(
      `[email/resend] RESEND_API_KEY is not set - ${featureLabel} is failing. ` +
        'Set it in the deployment environment (free tier at resend.com).'
    );
    throw new EmailProviderError(
      'Resend API key is required in production',
      'resend',
      true
    );
  }
  return false;
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

    await axios.post(
      RESEND_API_URL,
      {
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: data.to,
        subject: data.subject,
        html: data.html,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true };
  } catch (error) {
    if (error instanceof EmailProviderError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    throw new EmailProviderError(errorMessage, 'resend');
  }
}
