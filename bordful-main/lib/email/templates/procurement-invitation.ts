import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type ProcurementInvitationEmailData = {
  buyerCompanyName: string;
  requestTitle: string;
  requestType: string;
  responseDeadline: string | null;
  requiresPrequalification: boolean;
  respondUrl: string;
};

export function renderProcurementInvitationEmail({
  buyerCompanyName,
  requestTitle,
  requestType,
  responseDeadline,
  requiresPrequalification,
  respondUrl,
}: ProcurementInvitationEmailData): { subject: string; html: string } {
  const deadlineLine = responseDeadline
    ? `<p style="margin: 0 0 20px; font-size: 13px; color: #a1a1aa;">Response deadline: ${h(new Date(responseDeadline).toUTCString())}</p>`
    : '';

  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 36px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${EMAIL_BRAND_COLOR}; background: #eef2ff; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        ${h(requestType.toUpperCase())} invitation
      </div>
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">
        ${h(buyerCompanyName)} invited you to respond
      </h1>
      <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.65; color: #52525b;">
        <strong>${h(requestTitle)}</strong>
      </p>
      ${
        requiresPrequalification
          ? `<p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #71717a;">This request requires prequalification - the buyer will review your profile before you can submit a response.</p>`
          : ''
      }
      ${deadlineLine}
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(4, 36, 84, 0.35);">
            <a href="${h(respondUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">View request &rarr;</a>
          </td>
        </tr>
      </table>
    </div>

    ${emailFooter({
      customBottomLine: "You're receiving this because a buyer invited your Caliber recruiter account to a procurement request.",
    })}
  `);

  return {
    subject: `${buyerCompanyName} invited you to respond: ${requestTitle}`,
    html,
  };
}
