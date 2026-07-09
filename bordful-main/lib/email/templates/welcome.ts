import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, wrapEmailBody } from './shared';

export type WelcomeEmailData = {
  companyName: string;
  dashboardUrl: string;
};

/**
 * Matches the "1A - Welcome Email" design in
 * email-template-design-request/project/Email Templates.dc.html exactly -
 * same copy, layout, colors, and 3-step onboarding list.
 */
export function renderWelcomeEmail({
  companyName,
  dashboardUrl,
}: WelcomeEmailData): { subject: string; html: string } {
  const step = (n: number, title: string, description: string) => `
    <div style="display: flex; gap: 14px; padding: 16px 0; border-top: 1px solid #f0f0f1;">
      <div style="flex: 0 0 auto; width: 26px; height: 26px; border-radius: 50%; background: #ecf4f6; color: ${EMAIL_BRAND_COLOR}; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;">${n}</div>
      <div>
        <div style="font-size: 14px; font-weight: 600; color: #18181b;">${title}</div>
        <div style="font-size: 13px; color: #71717a; margin-top: 2px;">${description}</div>
      </div>
    </div>`;

  const html = wrapEmailBody(`
    ${emailHeader()}

    <div style="padding: 40px 40px 8px;">
      <div style="font-size: 13px; font-weight: 600; color: ${EMAIL_BRAND_COLOR}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;">Employer account</div>
      <h1 style="margin: 0 0 14px; font-size: 26px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">Welcome to JobLo, ${companyName}</h1>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #52525b;">Your employer account is live. You're one step from getting your role in front of thousands of candidates browsing JobLo every day.</p>
      <a href="${dashboardUrl}" style="display: inline-block; background: ${EMAIL_BRAND_COLOR}; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 6px;">Post your first job</a>
    </div>

    <div style="padding: 12px 40px 36px;">
      ${step(1, 'Post your first job', "Add a title, description and salary range - it's live in minutes.")}
      ${step(2, 'Set up your company profile', 'Add a logo and description so candidates recognize you.')}
      ${step(3, 'Track applicants from your dashboard', 'See views, applications and manage listings in one place.')}
    </div>

    ${emailFooter()}
  `);

  return {
    subject: "Welcome to JobLo - let's get your first job posted",
    html,
  };
}
