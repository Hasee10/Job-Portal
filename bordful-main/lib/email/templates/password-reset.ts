import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, wrapEmailBody } from './shared';

export type PasswordResetEmailData = {
  resetUrl: string;
};

export function renderPasswordResetEmail({
  resetUrl,
}: PasswordResetEmailData): { subject: string; html: string } {
  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 36px;">
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">Reset your password</h1>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.65; color: #52525b;">We received a request to reset your JobLo employer account password. This link expires in 1 hour and can only be used once.</p>
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 78, 99, 0.35);">
            <a href="${resetUrl}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">Reset password</a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">If you didn't request this, you can safely ignore this email - your password won't be changed.</p>
    </div>

    ${emailFooter()}
  `);

  return {
    subject: 'Reset your JobLo password',
    html,
  };
}
