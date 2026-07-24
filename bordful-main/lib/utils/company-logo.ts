import 'server-only';

// Logo.dev: real company name -> domain (Brand Search API, secret key) ->
// logo image (img.logo.dev, publishable key). Two distinct keys by design
// - the secret key never reaches the client, the publishable key is safe
// to embed directly in a rendered <img> src.
const SEARCH_URL = 'https://api.logo.dev/search';
const IMAGE_BASE_URL = 'https://img.logo.dev';

// Company logos don't change often - cached well beyond the page's own
// revalidate window so we're not burning the free-tier request quota on
// every homepage regeneration.
const LOGO_CACHE_SECONDS = 60 * 60 * 24 * 7; // 7 days

type LogoDevSearchResult = { name: string; domain: string };

async function resolveCompanyDomain(companyName: string): Promise<string | null> {
  const secretKey = process.env.LOGODEV_SECRET_KEY;
  if (!secretKey) return null;

  try {
    const response = await fetch(
      `${SEARCH_URL}?q=${encodeURIComponent(companyName)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        next: { revalidate: LOGO_CACHE_SECONDS },
      }
    );
    if (!response.ok) return null;

    const results = (await response.json()) as LogoDevSearchResult[];
    return results[0]?.domain ?? null;
  } catch (error) {
    console.error(`[company-logo] Domain lookup failed for "${companyName}":`, error);
    return null;
  }
}

// Not a real, distinguishable brand - some job listings hide the employer
// name, so there's nothing to look up and no logo could ever be correct.
function isRealCompanyName(companyName: string): boolean {
  return companyName.trim().toLowerCase() !== 'confidential company';
}

// Returns null (never a guessed or wrong logo) for anything that isn't
// configured or doesn't resolve - callers must fall back to plain text.
export async function getCompanyLogoUrl(companyName: string): Promise<string | null> {
  const publishableKey = process.env.LOGODEV_PUBLISHABLE_KEY;
  if (!(publishableKey && isRealCompanyName(companyName))) return null;

  const domain = await resolveCompanyDomain(companyName);
  if (!domain) return null;

  return `${IMAGE_BASE_URL}/${domain}?token=${publishableKey}&size=80&format=png`;
}

export async function getCompanyLogoUrls(
  companyNames: string[]
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    companyNames.map(async (name) => [name, await getCompanyLogoUrl(name)] as const)
  );
  return new Map(
    entries.filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}
