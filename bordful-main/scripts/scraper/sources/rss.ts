// Generic RSS 2.0 scraper.
// Each source configures how its feed fields map to ScrapedJob fields.
import { XMLParser } from 'fast-xml-parser';
import type { ScrapedJob } from '../types';

export interface RssSourceConfig {
  name: string;         // matches ScrapedJob.source
  feedUrl: string;
  defaultCountry?: string;
  companyField?: string;   // dot-path in parsed item (e.g. 'company', 'dc:creator')
  cityField?: string;
  countryField?: string;
  jobIdField?: string;     // dot-path for dedup ID (falls back to URL slug)
  titleTransform?: (raw: string) => { title: string; company: string };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

// CDATA blocks are treated as literal text — numeric HTML entities inside them
// are NOT decoded by the XML parser. Decode them manually so date strings
// like "Thu, 09 Jul 2026 21:20:30 &#x2B;0000" parse correctly.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

function parseDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(decodeEntities(String(raw)));
  return isNaN(d.getTime()) ? undefined : d;
}

function getNestedValue(obj: Record<string, unknown>, dotPath: string): string {
  const val = dotPath.split('.').reduce<unknown>((cur, key) => {
    if (cur && typeof cur === 'object') return (cur as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof val === 'string' ? val : (val != null ? String(val) : '');
}

function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.pathname + u.search).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}

export async function scrapeRss(config: RssSourceConfig): Promise<ScrapedJob[]> {
  console.log(`[${config.name}] Fetching RSS: ${config.feedUrl}`);

  const res = await fetch(config.feedUrl, {
    headers: { 'User-Agent': 'Joblo-Aggregator/1.0 (+https://joblo.app)' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    console.error(`[${config.name}] HTTP ${res.status} — skipping`);
    return [];
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);

  const rawItems: Record<string, unknown>[] = (() => {
    const channel = parsed?.rss?.channel ?? parsed?.feed;
    if (!channel) return [];
    const items = channel.item ?? channel.entry ?? [];
    return Array.isArray(items) ? items : [items];
  })();

  const jobs: ScrapedJob[] = [];

  for (const item of rawItems) {
    const rawTitle = String(item.title ?? '').trim();
    // <link> in Atom feeds is an object; fall back to <guid>
    const link = String(
      typeof item.link === 'object'
        ? (item.link as Record<string, unknown>)['#text'] ?? item.guid
        : item.link ?? item.guid ?? ''
    ).trim();

    if (!rawTitle || !link) continue;

    let title = rawTitle;
    let company = '';

    if (config.titleTransform) {
      ({ title, company } = config.titleTransform(rawTitle));
    } else if (config.companyField) {
      company = getNestedValue(item as Record<string, unknown>, config.companyField).trim();
    }

    // "Job Title at Company Name" convention used by some feeds
    if (!company && rawTitle.includes(' at ')) {
      const parts = rawTitle.split(' at ');
      title = parts.slice(0, -1).join(' at ').trim();
      company = parts[parts.length - 1].trim();
    }

    if (!company) company = config.name;

    const city = config.cityField
      ? getNestedValue(item as Record<string, unknown>, config.cityField).trim()
      : undefined;
    const country = config.countryField
      ? getNestedValue(item as Record<string, unknown>, config.countryField).trim()
      : config.defaultCountry;

    const jobId = config.jobIdField
      ? getNestedValue(item as Record<string, unknown>, config.jobIdField).trim() || slugFromUrl(link)
      : slugFromUrl(link);

    const pubDate = item.pubDate ?? item.pubdate ?? item.published ?? item.updated;
    const description = String(item.description ?? item.summary ?? item['content:encoded'] ?? '').trim();

    // Detect remote from title keywords
    const lowerTitle = title.toLowerCase();
    const remote_type =
      lowerTitle.includes('(remote)') || lowerTitle.includes('remote') ? 'remote' : 'onsite';

    jobs.push({
      title,
      company,
      apply_url: link,
      source: config.name,
      job_identifier: jobId,
      description: description || undefined,
      workplace_city: city || undefined,
      workplace_country: country || undefined,
      remote_type,
      posted_at: parseDate(pubDate),
    });
  }

  console.log(`[${config.name}] Parsed ${jobs.length} jobs from RSS`);
  return jobs;
}

// ─── Configured sources ───────────────────────────────────────────────────────

export const RSS_SOURCES: RssSourceConfig[] = [
  {
    // Verified working — 500 jobs, custom <company>/<city>/<country> tags
    name: 'mustakbil',
    feedUrl: 'https://rss.mustakbil.com/jobs-rss',
    defaultCountry: 'Pakistan',
    companyField: 'company',
    cityField: 'city',
    countryField: 'country',
    jobIdField: 'referencenumber',
    // Strip Mustakbil's " Jobs in City, Country" suffix appended to every title
    titleTransform: (raw) => {
      const cleaned = raw.replace(/\s+Jobs\s+in\s+.+$/i, '').trim();
      return { title: cleaned || raw.trim(), company: '' };
    },
  },
  {
    // Verified working — small feed (~6 jobs) but useful for PK coverage
    name: 'jobs-com-pk',
    feedUrl: 'https://www.jobs.com.pk/rss',
    defaultCountry: 'Pakistan',
  },
];
