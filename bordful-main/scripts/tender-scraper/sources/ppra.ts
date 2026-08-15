// PPRA (Pakistan Public Procurement Regulatory Authority) - the federal
// government's public tender listing. Confirmed empirically before writing
// this (not assumed): robots.txt has no Disallow rules, the listing is
// real server-rendered HTML (tender reference numbers appear in raw curl
// output, no JS execution needed), no auth wall, and its filter form is a
// plain GET with query params - tested `advertise_date_from` +
// `procurement_category` live and got correctly narrowed results.
//
//   GET https://epms.ppra.gov.pk/public/tenders/active-tenders
//     ?procurement_category=<1|2|3|4>&advertise_date_from=YYYY-MM-DD&page=N
//   procurement_category: 1=Goods, 2=Works, 3=Consultancy Services,
//     4=Non-consultancy Services (Goods deliberately not fetched - out of
//     scope for the services/construction categories this feed targets)
//   50 rows/page, confirmed via a live "Page N of M" check.
//
// PPRA has no CPV-style classification, so rows are tagged with the same
// synthetic 2-digit prefixes TENDER_CATEGORIES already uses for TED (a
// deliberate simplification - see tender-categories.ts - so the one
// cpv_codes column and the feed page's category filter work uniformly
// across sources that don't share a real classification standard).
import * as cheerio from 'cheerio';
import type { ScrapedTender } from '../types';
import { fetchWithRetry } from '../http';

const BASE = 'https://epms.ppra.gov.pk';
const LIST_PATH = '/public/tenders/active-tenders';
const PAGE_SIZE = 50;
const MAX_PAGES = 10;
const DELAY_MS = 1500;

const PROCUREMENT_CATEGORY_TO_CPV_PREFIX: Record<string, string> = {
  '2': '45', // Works -> Construction
  '3': '79', // Consultancy Services -> Business services
  '4': '79', // Non-consultancy Services -> Business services
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toYyyyMmDd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// PPRA renders the deadline as separate date/time strings ("Sep 07, 2026" /
// "12:00 PM") with no timezone marker - treated as Pakistan Standard Time
// (UTC+5), the authority's own timezone, since that's what a Pakistani
// buyer reading the site would assume.
function parseDeadline(dateText: string, timeText: string): string | undefined {
  if (!dateText) return undefined;
  const combined = timeText ? `${dateText} ${timeText} GMT+0500` : `${dateText} GMT+0500`;
  const parsed = new Date(combined);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

// The "Advertised" column ("Aug 15, 2026", date only) - previously not
// captured at all, which meant every PPRA tender had a null
// publication_date: no "Published" line on its card, and "Newest first"
// sort couldn't order PPRA tenders against each other or against TED.
function parsePublicationDate(dateText: string): string | undefined {
  if (!dateText) return undefined;
  const parsed = new Date(`${dateText} GMT+0500`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetchWithRetry(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Caliber-Aggregator/1.0; +https://caliber.app)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(20_000),
      },
      { label: 'ppra' }
    );
    if (!res.ok) {
      console.warn(`[ppra] HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn('[ppra] Fetch error:', (e as Error).message);
    return null;
  }
}

function parseListPage(html: string, cpvPrefix: string): ScrapedTender[] {
  const $ = cheerio.load(html);
  const tenders: ScrapedTender[] = [];

  $('table.table-hover tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 7) return;

    const tenderNo = $(cells[1]).find('strong').first().text().trim();
    const detailsCell = $(cells[2]);
    const title = detailsCell.find('strong').first().text().trim();
    const orgCell = $(cells[3]);
    const org = orgCell.find('.tender-org').first().text().trim();
    const advertisedDate = $(cells[5]).text().trim();
    const closingCell = $(cells[6]);
    const closingDate = closingCell.find('strong').first().text().trim();
    const closingTime = closingCell.find('small').first().text().trim();
    const detailHref = $(row).find('a[href*="/tenders/tender-details/"]').first().attr('href');

    if (!tenderNo || !title || !detailHref) return;

    tenders.push({
      source: 'ppra',
      sourceId: tenderNo,
      title,
      buyerName: org || undefined,
      country: 'PAK',
      cpvCodes: [cpvPrefix],
      publicationDate: parsePublicationDate(advertisedDate),
      deadlineDate: parseDeadline(closingDate, closingTime),
      url: `${BASE}${detailHref}`,
    });
  });

  return tenders;
}

// lookbackDays mirrors ted.ts: covers the daily cron's own cadence plus a
// buffer, dedupe on (source, source_id) makes re-fetching free.
export async function scrapePpra(lookbackDays = 2): Promise<ScrapedTender[]> {
  const since = toYyyyMmDd(new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000));
  const tenders: ScrapedTender[] = [];

  for (const [category, cpvPrefix] of Object.entries(PROCUREMENT_CATEGORY_TO_CPV_PREFIX)) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${BASE}${LIST_PATH}?procurement_category=${category}&advertise_date_from=${since}&page=${page}`;
      const html = await fetchPage(url);
      if (!html) break;

      const pageTenders = parseListPage(html, cpvPrefix);
      tenders.push(...pageTenders);

      if (pageTenders.length < PAGE_SIZE) break; // last page
      await sleep(DELAY_MS);
    }
  }

  return tenders;
}
