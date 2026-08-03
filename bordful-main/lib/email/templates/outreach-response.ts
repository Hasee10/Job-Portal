import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type OutreachResponseEmailData = {
  seekerDisplay: string;
  response: 'accepted' | 'declined';
  jobTitle: string | null;
  dashboardUrl: string;
};

export function renderOutreachResponseEmail({
  seekerDisplay,
  response,
  jobTitle,
  dashboardUrl,
}: OutreachResponseEmailData): { subject: string; html: string } {
  const accepted = response === 'accepted';
  const accentColor = accepted ? '#16a34a' : '#71717a';
  const badgeBg = accepted ? '#f0fdf4' : '#f4f4f5';
  const badgeText = accepted ? 'Accepted' : 'Declined';

  const headline = accepted
    ? `${h(seekerDisplay)} accepted your outreach`
    : `${h(seekerDisplay)} declined your outreach`;

  const body = accepted
    ? jobTitle
      ? `Great news — <strong>${h(seekerDisplay)}</strong> accepted your invite to apply for <strong>${h(jobTitle)}</strong>. Their contact details are now visible in your pipeline.`
      : `Great news — <strong>${h(seekerDisplay)}</strong> has accepted your outreach. You can now see their full profile and contact them directly from your pipeline.`
    : `<strong>${h(seekerDisplay)}</strong> has declined your outreach. This happens sometimes — keep building your pipeline and you&rsquo;ll find great candidates.`;

  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 36px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${accentColor}; background: ${badgeBg}; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        ${badgeText}
      </div>
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">${headline}</h1>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.65; color: #52525b;">${body}</p>
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 78, 99, 0.35);">
            <a href="${h(dashboardUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">View your pipeline &rarr;</a>
          </td>
        </tr>
      </table>
    </div>

    ${emailFooter({ audience: 'recruiter' })}
  `);

  return {
    subject: accepted
      ? `${seekerDisplay} accepted your outreach`
      : `${seekerDisplay} declined your outreach`,
    html,
  };
}
