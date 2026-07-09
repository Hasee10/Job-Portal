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

const CHECK_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top: 2px; flex: none;"><path d="M5 12.5L9.5 17L19 7" stroke="${EMAIL_BRAND_COLOR}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * Matches the "1B - Purchase Confirmation Email" design in
 * email-template-design-request/project/Email Templates.dc.html exactly.
 *
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
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      ${CHECK_SVG}
      <span style="font-size: 14px; color: #3f3f46;">${text}</span>
    </div>`;

  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 36px 40px 8px; text-align: center;">
      <div style="width: 44px; height: 44px; border-radius: 50%; background: #ecf4f6; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        ${CHECK_SVG}
      </div>
      <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">Payment confirmed</h1>
      <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #71717a;">Thanks for your purchase - here's your receipt for the ${planName} plan.</p>
    </div>

    <div style="padding: 0 40px;">
      <div style="border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
        <div style="padding: 16px 20px; background: #fafafa; border-bottom: 1px solid #e4e4e7; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 14px; font-weight: 700; color: #18181b;">${planName} plan</span>
          <span style="font-size: 14px; font-weight: 700; color: #18181b;">${priceFormatted}</span>
        </div>
        <div style="padding: 16px 20px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: #71717a;">Billing</span>
            <span style="color: #18181b; font-weight: 500;">${billingDescription}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: #71717a;">Charged to</span>
            <span style="color: #18181b; font-weight: 500;">${paymentMethodLabel}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: #71717a;">Date</span>
            <span style="color: #18181b; font-weight: 500;">${dateFormatted}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; padding-top: 10px; border-top: 1px solid #f0f0f1;">
            <span style="color: #18181b; font-weight: 700;">Total charged</span>
            <span style="color: #18181b; font-weight: 700;">${priceFormatted}</span>
          </div>
        </div>
      </div>
    </div>

    <div style="padding: 24px 40px 8px;">
      <div style="font-size: 12px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px;">What's included</div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${features.map(featureRow).join('')}
      </div>
    </div>

    <div style="padding: 28px 40px 8px;">
      <a href="${dashboardUrl}" style="display: block; text-align: center; background: ${EMAIL_BRAND_COLOR}; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 6px;">Go to dashboard</a>
    </div>

    ${emailFooter({ isReceipt: true })}
  `);

  return {
    subject: `Your JobLo receipt - ${planName} plan confirmed`,
    html,
  };
}
