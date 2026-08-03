import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, h, wrapEmailBody } from './shared';

export type JobMatchDigestRow = {
  title: string;
  company: string;
  city?: string | null;
  url: string;
  // Plain text, already human-readable - e.g. "React, TypeScript" or
  // "87% match — strong overlap on backend skills". Escaped by this
  // template, so callers should pass raw text, not pre-escaped HTML.
  detail: string;
};

export type JobMatchDigestData = {
  // e.g. `3 new jobs match "Remote React roles"` or `5 new jobs match your resume skills`
  headline: string;
  // e.g. `Based on your saved search on Caliber.` or `Based on the resume you uploaded to Caliber.`
  contextLine: string;
  matches: JobMatchDigestRow[];
  browseUrl: string;
  // e.g. "you saved this search" or "you uploaded a resume"
  reasonForReceiving: string;
};

// Shared by both saved-search alerts and resume-skill matches - the two
// digest types differ only in headline/context copy and what the per-row
// "detail" line says (matched skills vs. an AI fit score), not in layout.
export function renderJobMatchDigestEmail({
  headline,
  contextLine,
  matches,
  browseUrl,
  reasonForReceiving,
}: JobMatchDigestData): { subject: string; html: string } {
  const rows = matches
    .map(
      (match) => `
      <tr>
        <td style="padding: 0 0 18px;">
          <a href="${h(match.url)}" style="font-size: 15px; font-weight: 700; color: #18181b; text-decoration: none;">${h(match.title)}</a>
          <div style="margin-top: 2px; font-size: 13px; color: #71717a;">
            ${h(match.company)}${match.city ? ` &middot; ${h(match.city)}` : ''}
          </div>
          <div style="margin-top: 3px; font-size: 12px; color: #a1a1aa;">${h(match.detail)}</div>
        </td>
      </tr>`
    )
    .join('');

  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 8px;">
      <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${EMAIL_BRAND_COLOR}; background: #ecf4f6; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">
        New matches
      </div>
      <h1 style="margin: 0 0 8px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">${h(headline)}</h1>
      <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #71717a;">${h(contextLine)}</p>
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
        ${rows}
      </table>
      <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 8px;">
        <tr>
          <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 78, 99, 0.35);">
            <a href="${h(browseUrl)}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">Browse all jobs &rarr;</a>
          </td>
        </tr>
      </table>
    </div>
    <div style="padding: 0 40px 32px;"></div>

    ${emailFooter({
      customBottomLine: `You're receiving this because ${reasonForReceiving} on Caliber.`,
    })}
  `);

  return { subject: headline, html };
}
