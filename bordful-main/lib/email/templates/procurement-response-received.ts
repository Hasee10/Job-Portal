import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type ProcurementResponseReceivedEmailData = {
  requestTitle: string;
  sealedBids: boolean;
  requestUrl: string;
};

export function renderProcurementResponseReceivedEmail({
  requestTitle,
  sealedBids,
  requestUrl,
}: ProcurementResponseReceivedEmailData): { subject: string; html: string } {
  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 36px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${EMAIL_BRAND_COLOR}; background: #eef2ff; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        New response
      </div>
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">
        A vendor responded to ${h(requestTitle)}
      </h1>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.65; color: #52525b;">
        ${
          sealedBids
            ? "This request uses sealed bidding, so the response content stays hidden - including from you - until you close the request and open bids after the deadline."
            : 'You can review the full response now.'
        }
      </p>
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(4, 36, 84, 0.35);">
            <a href="${h(requestUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">View request &rarr;</a>
          </td>
        </tr>
      </table>
    </div>

    ${emailFooter({ audience: 'employer' })}
  `);

  return {
    subject: `New response: ${requestTitle}`,
    html,
  };
}
