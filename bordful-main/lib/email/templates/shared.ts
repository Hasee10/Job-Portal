// Shared building blocks for transactional email HTML - kept out of the
// individual template files so the brand mark/colors/footer only need to
// change in one place.
//
// Built with <table> layouts rather than flexbox: Outlook desktop renders
// email HTML with Word's engine, which has no flexbox/grid support at all -
// tables are the only layout primitive that reliably renders identically
// across Gmail, Apple Mail, and Outlook.

export const EMAIL_BRAND_COLOR = '#164e63';
export const EMAIL_BRAND_COLOR_DARK = '#0d3a49';
export const EMAIL_ACCENT_COLOR = '#38bdf8';

// Same square "J" mark as app/icon.svg (the site favicon) - inlined as an
// <svg> rather than an <img src> since most email clients strip external
// image loading by default until the user explicitly allows it, and this
// mark is simple enough to render reliably inline everywhere.
export const LOGO_SVG = `<svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#ffffff"></rect>
  <path d="M14 8 L14 20 A6 6 0 0 1 4 24" fill="none" stroke="${EMAIL_BRAND_COLOR}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

export function emailHeader(): string {
  return `<table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: ${EMAIL_BRAND_COLOR}; background-image: linear-gradient(135deg, ${EMAIL_BRAND_COLOR} 0%, ${EMAIL_BRAND_COLOR_DARK} 100%);">
  <tr>
    <td style="padding: 36px 40px 32px; text-align: center;">
      <table align="center" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding-right: 9px; vertical-align: middle;">${LOGO_SVG}</td>
          <td style="vertical-align: middle;">
            <span style="font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">JobLo</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="height: 4px; line-height: 4px; font-size: 0; background: linear-gradient(90deg, ${EMAIL_ACCENT_COLOR} 0%, ${EMAIL_BRAND_COLOR} 100%);">&nbsp;</td>
  </tr>
</table>`;
}

export function emailFooter(options?: {
  isReceipt?: boolean;
  audience?: 'employer' | 'seeker';
}): string {
  // Both of these are transactional (account-creation confirmation, payment
  // receipt) rather than marketing sends, so an unsubscribe link isn't
  // required the way it would be for a promotional email - kept out
  // entirely rather than emitting a merge-tag placeholder (like
  // {{unsubscribe_url}}) that wouldn't actually get replaced when this HTML
  // is passed through the provider's API as a raw property value.
  const bottomLine = options?.isReceipt
    ? 'This is a receipt for your records - keep it for your files.'
    : options?.audience === 'seeker'
      ? "You're receiving this because you created a JobLo job seeker account."
      : "You're receiving this because you created a JobLo employer account.";

  return `<table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr><td style="height: 1px; line-height: 1px; font-size: 0; background: #ececef;">&nbsp;</td></tr>
  <tr>
    <td style="padding: 28px 40px 32px; text-align: center; background: #fafafa;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #71717a;">${
        options?.isReceipt
          ? 'Need a hand? Contact us at'
          : 'Questions? Reply anytime or write to'
      } <a href="mailto:hello@joblo.com" style="color: ${EMAIL_BRAND_COLOR}; font-weight: 600; text-decoration: none;">hello@joblo.com</a></p>
      <p style="margin: 0 0 14px; font-size: 12px; color: #a1a1aa; line-height: 1.6;">${bottomLine}</p>
      <p style="margin: 0; font-size: 12px; color: #d4d4d8; font-weight: 600; letter-spacing: 0.02em;">JOBLO, INC.</p>
    </td>
  </tr>
</table>`;
}

/**
 * Wraps template-specific content in the outer email chrome shared by every
 * transactional email - the soft page background, floating rounded card
 * with a subtle shadow, and a plain-text-friendly wrapper. Built as tables
 * throughout (see file header) rather than the app's own flexbox-based UI,
 * since email clients can't be relied on for modern CSS layout.
 */
export function wrapEmailBody(innerHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JobLo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #eef1f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #eef1f4;">
    <tr>
      <td style="padding: 40px 16px;">
        <table align="center" width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);">
          <tr>
            <td>
              ${innerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
