import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, wrapEmailBody } from './shared';

export type PasswordResetEmailData = {
  resetUrl: string;
};

export function renderPasswordResetEmail({
  resetUrl,
}: PasswordResetEmailData): { subject: string; html: string } {
  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 8px;">
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">Reset your password</h1>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #52525b;">We received a request to reset your JobLo employer account password. This link expires in 1 hour and can only be used once.</p>
      <a href="${resetUrl}" style="display: inline-block; background: ${EMAIL_BRAND_COLOR}; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 6px;">Reset password</a>
      <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">If you didn't request this, you can safely ignore this email - your password won't be changed.</p>
    </div>

    ${emailFooter()}
  `);

  return {
    subject: 'Reset your JobLo password',
    html,
  };
}
