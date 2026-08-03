import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type CandidateDigestRow = {
  name: string;
  headline: string | null;
  skills: string[];
  matchScore: number;
};

export type RecruiterCandidateDigestData = {
  recruiterName: string;
  candidates: CandidateDigestRow[];
  browseUrl: string;
};

export function renderRecruiterCandidateDigestEmail({
  recruiterName,
  candidates,
  browseUrl,
}: RecruiterCandidateDigestData): { subject: string; html: string } {
  const rows = candidates
    .map(
      (c) => `
      <tr>
        <td style="padding: 0 0 18px;">
          <div style="font-size: 15px; font-weight: 700; color: #18181b;">${h(c.name)}</div>
          <div style="margin-top: 2px; font-size: 13px; color: #71717a;">
            ${c.headline ? h(c.headline) : 'No headline provided'}
          </div>
          <div style="margin-top: 3px; font-size: 12px; color: #a1a1aa;">
            ${c.matchScore}% match${c.skills.length ? ` &middot; ${h(c.skills.slice(0, 5).join(', '))}` : ''}
          </div>
        </td>
      </tr>`
    )
    .join('');

  const headline = `${candidates.length} new candidate${candidates.length > 1 ? 's' : ''} match your specialties`;

  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 8px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${EMAIL_BRAND_COLOR}; background: #ecf4f6; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        New candidates
      </div>
      <h1 style="margin: 0 0 8px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">${h(headline)}</h1>
      <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #71717a;">
        Hi ${h(recruiterName)}, these opted-in candidates joined Caliber and match your specialties.
      </p>
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
        ${rows}
      </table>
      <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 8px;">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 78, 99, 0.35);">
            <a href="${h(browseUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">Browse candidates &rarr;</a>
          </td>
        </tr>
      </table>
    </div>
    <div style="padding: 0 40px 32px;"></div>

    ${emailFooter({
      audience: 'recruiter',
      customBottomLine: "You're receiving this because you're a verified recruiter on Caliber with specialties set on your profile.",
    })}
  `);

  return { subject: headline, html };
}
