import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type ProcurementAwardDecisionEmailData = {
  requestTitle: string;
  won: boolean;
  dashboardUrl: string;
};

export function renderProcurementAwardDecisionEmail({
  requestTitle,
  won,
  dashboardUrl,
}: ProcurementAwardDecisionEmailData): { subject: string; html: string } {
  const accentColor = won ? '#16a34a' : '#71717a';
  const badgeBg = won ? '#f0fdf4' : '#f4f4f5';

  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 36px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${accentColor}; background: ${badgeBg}; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        ${won ? 'Awarded' : 'Decision made'}
      </div>
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">
        ${won ? `You were awarded ${h(requestTitle)}` : `${h(requestTitle)} has been awarded`}
      </h1>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.65; color: #52525b;">
        ${
          won
            ? "Congratulations — the buyer has selected your response. They'll be in touch with next steps."
            : "The buyer has awarded this request to another vendor. Thanks for your submission — keep an eye out for future opportunities."
        }
      </p>
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(4, 36, 84, 0.35);">
            <a href="${h(dashboardUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">View invitations &rarr;</a>
          </td>
        </tr>
      </table>
    </div>

    ${emailFooter({
      customBottomLine: "You're receiving this because you submitted a response to this procurement request.",
    })}
  `);

  return {
    subject: won ? `You were awarded: ${requestTitle}` : `Award decision: ${requestTitle}`,
    html,
  };
}
