import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type EmployerInviteEmailData = {
  companyName: string;
  jobTitle: string;
  message: string;
  inboxUrl: string;
};

export function renderEmployerInviteEmail({
  companyName,
  jobTitle,
  message,
  inboxUrl,
}: EmployerInviteEmailData): { subject: string; html: string } {
  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 36px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${EMAIL_BRAND_COLOR}; background: #ecf4f6; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        Job invitation
      </div>
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">
        ${h(companyName)} invited you to apply
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.65; color: #52525b;">
        They think you&rsquo;d be a great fit for <strong>${h(jobTitle)}</strong>.
      </p>
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom: 28px;">
        <tr>
          <td style="border-left: 3px solid #cfe3e8; background: #f9fafb; border-radius: 0 8px 8px 0; padding: 16px 18px;">
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #3f3f46; font-style: italic;">${h(message)}</p>
          </td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 78, 99, 0.35);">
            <a href="${h(inboxUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">View in inbox &rarr;</a>
          </td>
        </tr>
      </table>
    </div>

    ${emailFooter({
      customBottomLine:
        "You're receiving this because you enabled recruiter visibility on your account. Turn it off anytime from your inbox settings.",
    })}
  `);

  return {
    subject: `${companyName} invited you to apply for ${jobTitle}`,
    html,
  };
}
