import { EMAIL_BRAND_COLOR, emailFooter, emailHeader, wrapEmailBody } from './shared';

export type WelcomeEmailData = {
  companyName: string;
  dashboardUrl: string;
};

export function renderWelcomeEmail({
  companyName,
  dashboardUrl,
}: WelcomeEmailData): { subject: string; html: string } {
  const step = (n: number, title: string, description: string, isLast: boolean) => `
    <tr>
      <td width="36" style="vertical-align: top; padding: ${isLast ? '0' : '0 0 20px'} 0;">
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td width="28" height="28" align="center" valign="middle" style="background: ${EMAIL_BRAND_COLOR}; border-radius: 50%; font-size: 13px; font-weight: 700; color: #ffffff;">${n}</td>
          </tr>
        </table>
      </td>
      <td style="vertical-align: top; padding: 0 0 ${isLast ? '0' : '20px'} 14px;">
        <div style="font-size: 14px; font-weight: 700; color: #18181b;">${title}</div>
        <div style="font-size: 13px; color: #71717a; margin-top: 3px; line-height: 1.5;">${description}</div>
      </td>
    </tr>`;

  const html = wrapEmailBody(`
    ${emailHeader()}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding: 40px 40px 4px;">
          <div style="display: inline-block; font-size: 12px; font-weight: 700; color: ${EMAIL_BRAND_COLOR}; background: #ecf4f6; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">Employer account</div>
          <h1 style="margin: 0 0 14px; font-size: 26px; line-height: 1.3; font-weight: 800; color: #18181b; letter-spacing: -0.01em;">Welcome to JobLo, ${companyName} 👋</h1>
          <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.65; color: #52525b;">Your employer account is live. You're one step from getting your role in front of thousands of candidates browsing JobLo every day.</p>
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="background: ${EMAIL_BRAND_COLOR}; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 78, 99, 0.35);">
                <a href="${dashboardUrl}" style="display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px;">Post your first job &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding: 8px 40px 4px;">
          <div style="height: 1px; background: #ececef;"></div>
        </td>
      </tr>

      <tr>
        <td style="padding: 28px 40px 36px;">
          <div style="font-size: 12px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px;">Get started in 3 steps</div>
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            ${step(1, 'Post your first job', "Add a title, description and salary range - it's live in minutes.", false)}
            ${step(2, 'Set up your company profile', 'Add a logo and description so candidates recognize you.', false)}
            ${step(3, 'Track applicants from your dashboard', 'See views, applications and manage listings in one place.', true)}
          </table>
        </td>
      </tr>
    </table>

    ${emailFooter()}
  `);

  return {
    subject: "Welcome to JobLo - let's get your first job posted",
    html,
  };
}
