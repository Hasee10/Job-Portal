// Shared building blocks for transactional email HTML - kept out of the
// individual template files so the brand mark/colors/footer only need to
// change in one place. Matches the design handoff in
// email-template-design-request/project/Email Templates.dc.html exactly.

export const EMAIL_BRAND_COLOR = '#164e63';

// Same square "J" mark as app/icon.svg (the site favicon) - inlined as an
// <svg> rather than an <img src> since most email clients strip external
// image loading by default until the user explicitly allows it, and this
// mark is simple enough to render reliably inline everywhere.
export const LOGO_SVG = `<svg width="26" height="26" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="${EMAIL_BRAND_COLOR}"></rect>
  <path d="M14 8 L14 20 A6 6 0 0 1 4 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

export function emailHeader(): string {
  return `<div style="padding: 28px 40px; text-align: center; border-bottom: 1px solid #f0f0f1;">
  <div style="display: inline-flex; align-items: center; gap: 8px;">
    ${LOGO_SVG}
    <span style="font-size: 20px; font-weight: 800; color: #18181b; letter-spacing: -0.02em;">JobLo</span>
  </div>
</div>`;
}

export function emailFooter(options?: { isReceipt?: boolean }): string {
  // Both of these are transactional (account-creation confirmation, payment
  // receipt) rather than marketing sends, so an unsubscribe link isn't
  // required the way it would be for a promotional email - kept out
  // entirely rather than emitting a merge-tag placeholder (like
  // {{unsubscribe_url}}) that wouldn't actually get replaced when this HTML
  // is passed through Encharge's API as a raw property value.
  const bottomLine = options?.isReceipt
    ? 'JobLo, Inc. &middot; This is a receipt for your records.'
    : 'JobLo, Inc.';

  return `<div style="padding: 24px 40px 32px; border-top: 1px solid #f0f0f1; text-align: center;">
  <p style="margin: 0 0 6px; font-size: 13px; color: #a1a1aa;">${
    options?.isReceipt
      ? 'Need a hand? Contact us at'
      : 'Questions? Reply anytime or write to'
  } <a href="mailto:hello@joblo.com" style="color: ${EMAIL_BRAND_COLOR}; text-decoration: none;">hello@joblo.com</a></p>
  <p style="margin: 0; font-size: 12px; color: #d4d4d8;">${bottomLine}</p>
</div>`;
}

/**
 * Wraps template-specific content in the outer email/table chrome shared by
 * every transactional email - the light-gray page background, centered
 * 600px white card, and a plain-text-friendly wrapper. Email clients don't
 * reliably support modern CSS, so this stays deliberately simple
 * (inline styles, no flexbox/grid) rather than matching the prototype's
 * literal HTML structure.
 */
export function wrapEmailBody(innerHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JobLo</title>
</head>
<body style="margin: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    ${innerHtml}
  </div>
</body>
</html>`;
}
