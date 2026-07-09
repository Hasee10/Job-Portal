import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, wrapEmailBody } from './shared';

export type PurchaseConfirmationEmailData = {
  planName: string;
  /** Formatted price string, e.g. "$99.00" - callers own currency formatting. */
  priceFormatted: string;
  /** e.g. "One-time · per job listing" or "Recurring · per month" */
  billingDescription: string;
  /** e.g. "Visa •••• 4242" - last 4 digits only, never a full card number. */
  paymentMethodLabel: string;
  /** Pre-formatted date string, e.g. "Jul 9, 2026". */
  dateFormatted: string;
  features: string[];
  dashboardUrl: string;
};

const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12.5L9.5 17L19 7" stroke="${EMAIL_BRAND_COLOR}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * Not wired to a real trigger yet - the pricing page's CTAs still point to
 * /contact placeholders (no Stripe Checkout/webhook exists to fire this
 * from). Ready to call the moment that's built: pass the real plan/payment
 * details from the Stripe webhook handler into renderPurchaseConfirmationEmail().
 */
export function renderPurchaseConfirmationEmail({
  planName,
  priceFormatted,
  billingDescription,
  paymentMethodLabel,
  dateFormatted,
  features,
  dashboardUrl,
}: PurchaseConfirmationEmailData): { subject: string; html: string } {
  const featureRow = (text: string) => `
    <tr>
      <td width="22" style="vertical-align: top; padding: 0 0 10px;">${CHECK_SVG}</td>
      <td style="vertical-align: top; padding: 0 0 10px 8px; font-size: 14px; color: #3f3f46;">${text}</td>
    </tr>`;

  const detailRow = (label: string, value: string, isTotal = false) => `
    <tr>
      <td style="padding: ${isTotal ? '10px 0 0' : '0 0 10px'}; font-size: 13px; color: ${isTotal ? '#18181b' : '#71717a'}; font-weight: ${isTotal ? '700' : '400'}; ${isTotal ? 'border-top: 1px solid #f0f0f1;' : ''}">${label}</td>
      <td align="right" style="padding: ${isTotal ? '10px 0 0' : '0 0 10px'}; font-size: 13px; color: #18181b; font-weight: ${isTotal ? '700' : '500'}; ${isTotal ? 'border-top: 1px solid #f0f0f1;' : ''}">${value}</td>
    </tr>`;

  const html = wrapEmailBody(`
    ${emailHeader()}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding: 36px 40px 8px; text-align: center;">
          <table cellpadding="0" cellspacing="0" role="presentation" align="center">
            <tr>
              <td width="44" height="44" align="center" valign="middle" style="background: #ecf4f6; border-radius: 50%;">${CHECK_SVG}</td>
            </tr>
          </table>
          <h1 style="margin: 16px 0 8px; font-size: 22px; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">Payment confirmed</h1>
          <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #71717a;">Thanks for your purchase - here's your receipt for the ${planName} plan.</p>
        </td>
      </tr>

      <tr>
        <td style="padding: 0 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border: 1px solid #e4e4e7; border-radius: 8px;">
            <tr>
              <td style="padding: 16px 20px; background: #fafafa; border-bottom: 1px solid #e4e4e7; border-radius: 8px 8px 0 0; font-size: 14px; font-weight: 700; color: #18181b;">${planName} plan</td>
              <td align="right" style="padding: 16px 20px; background: #fafafa; border-bottom: 1px solid #e4e4e7; border-radius: 8px 8px 0 0; font-size: 14px; font-weight: 700; color: #18181b;">${priceFormatted}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 16px 20px 4px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  ${detailRow('Billing', billingDescription)}
                  ${detailRow('Charged to', paymentMethodLabel)}
                  ${detailRow('Date', dateFormatted)}
                  ${detailRow('Total charged', priceFormatted, true)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding: 24px 40px 8px;">
          <div style="font-size: 12px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px;">What's included</div>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            ${features.map(featureRow).join('')}
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding: 12px 40px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center" style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 78, 99, 0.35);">
                <a href="${dashboardUrl}" style="display: block; text-align: center; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">Go to dashboard</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${emailFooter({ isReceipt: true })}
  `);

  return {
    subject: `Your JobLo receipt - ${planName} plan confirmed`,
    html,
  };
}
