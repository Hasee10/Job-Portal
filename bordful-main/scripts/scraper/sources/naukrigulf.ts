// NaukriGulf.com — Gulf region job board (Indian-run, static HTML)
// Anti-scraping: light. Renders server-side, no Cloudflare.
// Rate limit: 1 request per 2 seconds.
import * as cheerio from 'cheerio';
import type { ScrapedJob } from '../types';

const BASE = 'https://www.naukrigulf.com';
const SOURCE = 'naukrigulf';
const MAX_PAGES = 5;
const DELAY_MS = 2000;

// Gulf countries in our DB format
const GULF_COUNTRIES = ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman'];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugFromPath(url: string): string {
  try {
    return new URL(url).pathname.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}

function normalizeCountry(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('uae') || lower.includes('dubai') || lower.includes('emirates')) return 'United Arab Emirates';
  if (lower.includes('saudi') || lower.includes('riyadh') || lower.includes('jeddah')) return 'Saudi Arabia';
  if (lower.includes('qatar') || lower.includes('doha')) return 'Qatar';
  if (lower.includes('kuwait')) return 'Kuwait';
  if (lower.includes('bahrain')) return 'Bahrain';
  if (lower.includes('oman') || lower.includes('muscat')) return 'Oman';
  return raw.trim();
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Joblo-Aggregator/1.0; +https://joblo.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': BASE,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`[${SOURCE}] HTTP ${res.status} for ${url}`);
      return null;
    }
    return res.text();
  } catch (e) {
    console.warn(`[${SOURCE}] Fetch error for ${url}:`, (e as Error).message);
    return null;
  }
}

export async function scrapeNaukriGulf(): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    // NaukriGulf pagination: /jobs-in-gulf-1, /jobs-in-gulf-2, etc.
    const url = page === 1
      ? `${BASE}/jobs-in-gulf`
      : `${BASE}/jobs-in-gulf-${page}`;

    console.log(`[${SOURCE}] Page ${page}: ${url}`);
    const html = await fetchPage(url);
    if (!html) break;

    const $ = cheerio.load(html);
    let found = 0;

    // NaukriGulf job cards — selectors based on their 2024/2025 HTML structure
    $('.job-listing, .srp-tuple, .jobTuple, .ni-job-tuple').each((_, el) => {
      const titleEl = $(el).find('a.job-title, .jobtitle a, h3.jobTitle a, .ni-job-tuple-title a').first();
      const title = titleEl.text().trim();
      let href = titleEl.attr('href') ?? '';
      if (!href) return;
      if (!href.startsWith('http')) href = `${BASE}${href}`;

      const company = $(el).find('.company-name, .companyName, .ni-job-tuple-company').first().text().trim();
      const locationRaw = $(el).find('.location, .loc, .ni-job-tuple-location').first().text().trim();
      const typeText = $(el).find('.job-type, .empType, .jobType').first().text().trim().toLowerCase();
      const expText = $(el).find('.exp, .experience').first().text().trim();

      let type: ScrapedJob['type'] = 'Full-time';
      if (typeText.includes('part')) type = 'Part-time';
      else if (typeText.includes('contract')) type = 'Contract';
      else if (typeText.includes('freelance')) type = 'Freelance';

      const country = locationRaw ? normalizeCountry(locationRaw) : 'United Arab Emirates';

      if (!title || !href) return;

      jobs.push({
        title,
        company: company || SOURCE,
        apply_url: href,
        source: SOURCE,
        job_identifier: slugFromPath(href),
        type,
        workplace_country: country,
        remote_type: 'onsite',
      });
      found++;
    });

    console.log(`[${SOURCE}] Page ${page}: found ${found} jobs`);
    if (found === 0) break;

    if (page < MAX_PAGES) await sleep(DELAY_MS);
  }

  console.log(`[${SOURCE}] Total: ${jobs.length} jobs`);
  return jobs;
}
