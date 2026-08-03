import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type ApplicationReceivedEmailData = {
  ownerType: 'employer' | 'recruiter';
  applicantName: string;
  jobTitle: string;
  matchScore: number;
  autoShortlisted: boolean;
  pipelineUrl: string;
};

export function renderApplicationReceivedEmail({
  ownerType,
  applicantName,
  jobTitle,
  matchScore,
  autoShortlisted,
  pipelineUrl,
}: ApplicationReceivedEmailData): { subject: string; html: string } {
  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 36px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${EMAIL_BRAND_COLOR}; background: #ecf4f6; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        New application
      </div>
      <h1 style="margin: 0 0 14px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">
        ${h(applicantName)} applied for ${h(jobTitle)}
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.65; color: #52525b;">
        ${
          autoShortlisted
            ? `Their profile matched your criteria at <strong>${matchScore}%</strong>, so they&rsquo;ve already been auto-shortlisted.`
            : `Their profile is a <strong>${matchScore}%</strong> match against your requirements for this role.`
        }
      </p>
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 78, 99, 0.35);">
            <a href="${h(pipelineUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">Review application &rarr;</a>
          </td>
        </tr>
      </table>
    </div>

    ${emailFooter({ audience: ownerType })}
  `);

  return {
    subject: `${applicantName} applied for ${jobTitle}`,
    html,
  };
}
