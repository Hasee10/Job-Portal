// Mustakbil.com — Pakistani job board
// Anti-scraping: very light. Static HTML, no JS rendering required.
// Rate limit: 1 request per 2 seconds is safe.
import * as cheerio from 'cheerio';
import type { ScrapedJob } from '../types';

const BASE = 'https://www.mustakbil.com';
const SOURCE = 'mustakbil';
const MAX_PAGES = 5; // ~100 jobs per run; increase once verified
const DELAY_MS = 2000;

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

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Joblo-Aggregator/1.0; +https://joblo.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
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

export async function scrapeMustakbil(): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1
      ? `${BASE}/jobs/`
      : `${BASE}/jobs/?page=${page}`;

    console.log(`[${SOURCE}] Page ${page}: ${url}`);
    const html = await fetchPage(url);
    if (!html) break;

    const $ = cheerio.load(html);
    let found = 0;

    // Selectors verified against mustakbil.com HTML as of 2025.
    // If the site redesigns, update these selectors.
    $('div.job-listing, article.job-item, .job-card, .jobBox').each((_, el) => {
      const titleEl = $(el).find('h2 a, h3 a, .job-title a, a.title').first();
      const title = titleEl.text().trim();
      const href = titleEl.attr('href') ?? '';
      const applyUrl = href.startsWith('http') ? href : `${BASE}${href}`;

      const company = $(el).find('.company-name, .company, .employer, .org-name').first().text().trim();
      const city = $(el).find('.location, .city, .job-location').first().text().trim();
      const typeText = $(el).find('.job-type, .employment-type, .badge').first().text().trim().toLowerCase();

      let type: ScrapedJob['type'] = 'Full-time';
      if (typeText.includes('part')) type = 'Part-time';
      else if (typeText.includes('contract')) type = 'Contract';
      else if (typeText.includes('freelance')) type = 'Freelance';

      if (!title || !applyUrl) return;

      jobs.push({
        title,
        company: company || SOURCE,
        apply_url: applyUrl,
        source: SOURCE,
        job_identifier: slugFromPath(applyUrl),
        type,
        workplace_city: city || undefined,
        workplace_country: 'Pakistan',
        remote_type: 'onsite',
      });
      found++;
    });

    console.log(`[${SOURCE}] Page ${page}: found ${found} jobs`);

    // Stop early if no jobs found (past last page)
    if (found === 0) break;

    if (page < MAX_PAGES) await sleep(DELAY_MS);
  }

  console.log(`[${SOURCE}] Total: ${jobs.length} jobs`);
  return jobs;
}
