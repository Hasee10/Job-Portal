// Derives a company/agency logo from a website URL via Clearbit's free,
// keyless logo API. Used by employer and recruiter profile forms as the
// "auto-picked" logo shown while the account is being set up - the account
// can still override it. Distinct from lib/utils/company-logo.ts, which
// resolves a logo from a company *name* (via Logo.dev) for job listing
// cards where no website URL is available.
export function deriveLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const domain = new URL(url).hostname.replace(/^www\./, '');
    return domain ? `https://logo.clearbit.com/${domain}` : null;
  } catch {
    return null;
  }
}
