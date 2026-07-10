// Generic RSS 2.0 scraper.
// Each source configures how its feed fields map to ScrapedJob fields.
import { XMLParser } from 'fast-xml-parser';
import type { ScrapedJob } from '../types';

export interface RssSourceConfig {
  name: string;         // matches ScrapedJob.source
  feedUrl: string;
  defaultCountry?: string;
  // Optional field overrides — most RSS job feeds use standard <title>/<link>
  // but some put the company in a custom tag. Provide a dot-path into the
  // parsed item object to override (e.g. 'dc:creator', 'job:company').
  companyField?: string;
  titleTransform?: (raw: string) => { title: string; company: string };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function getNestedValue(obj: Record<string, unknown>, dotPath: string): string {
  return dotPath.split('.').reduce<unknown>((cur, key) => {
    if (cur && typeof cur === 'object') return (cur as Record<string, unknown>)[key];
    return undefined;
  }, obj) as string ?? '';
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
    const link = String(item.link ?? item.guid ?? '').trim();

    if (!rawTitle || !link) continue;

    let title = rawTitle;
    let company = '';

    if (config.titleTransform) {
      ({ title, company } = config.titleTransform(rawTitle));
    } else if (config.companyField) {
      company = getNestedValue(item as Record<string, unknown>, config.companyField);
    }

    // Many job RSS feeds encode "Job Title at Company Name" in <title>
    if (!company && rawTitle.includes(' at ')) {
      const parts = rawTitle.split(' at ');
      title = parts.slice(0, -1).join(' at ').trim();
      company = parts[parts.length - 1].trim();
    }

    if (!company) company = config.name; // fallback

    const pubDate = item.pubDate ?? item.published ?? item.updated;
    const description = String(item.description ?? item.summary ?? item.content ?? '').trim();

    jobs.push({
      title,
      company,
      apply_url: link,
      source: config.name,
      job_identifier: slugFromUrl(link),
      description: description || undefined,
      workplace_country: config.defaultCountry,
      posted_at: pubDate ? new Date(String(pubDate)) : undefined,
    });
  }

  console.log(`[${config.name}] Parsed ${jobs.length} jobs from RSS`);
  return jobs;
}

// ─── Configured sources ───────────────────────────────────────────────────────

export const RSS_SOURCES: RssSourceConfig[] = [
  {
    name: 'gulftalent-rss',
    feedUrl: 'https://www.gulftalent.com/rss/jobs.xml',
    defaultCountry: 'United Arab Emirates',
  },
  {
    name: 'dawn-jobs-rss',
    feedUrl: 'https://www.dawn.com/feeds/latest-jobs',
    defaultCountry: 'Pakistan',
  },
  {
    name: 'rozee-rss',
    feedUrl: 'https://www.rozee.pk/rss/jobs.rss',
    defaultCountry: 'Pakistan',
  },
];
