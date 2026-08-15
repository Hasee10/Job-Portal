import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type ProcurementDeadlineReminderEmailData = {
  requestTitle: string;
  responseDeadline: string;
  respondUrl: string;
};

export function renderProcurementDeadlineReminderEmail({
  requestTitle,
  responseDeadline,
  respondUrl,
}: ProcurementDeadlineReminderEmailData): { subject: string; html: string } {
  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 36px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: #b45309; background: #fffbeb; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        Deadline approaching
      </div>
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">
        ${h(requestTitle)} closes soon
      </h1>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.65; color: #52525b;">
        The response deadline is <strong>${h(new Date(responseDeadline).toUTCString())}</strong>. Submit your response before then if you haven't already.
      </p>
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(4, 36, 84, 0.35);">
            <a href="${h(respondUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">Respond now &rarr;</a>
          </td>
        </tr>
      </table>
    </div>

    ${emailFooter({
      customBottomLine: "You're receiving this because you have an open invitation to this procurement request.",
    })}
  `);

  return {
    subject: `Deadline approaching: ${requestTitle}`,
    html,
  };
}
