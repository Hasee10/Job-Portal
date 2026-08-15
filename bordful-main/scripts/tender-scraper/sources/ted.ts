// TED (Tenders Electronic Daily) - the EU's official public-procurement
// notice portal. Search API confirmed free, unauthenticated, and openly
// accessible (docs.ted.europa.eu/api/latest/search.html) - contract details
// below were confirmed empirically against the live API (its own docs pages
// don't publish a request/response schema), not assumed:
//
//   POST https://api.ted.europa.eu/v3/notices/search
//   body: { query: string, fields: string[], limit: number, page?: number }
//   query DSL: `field=value`, `*` wildcard, `AND`, date comparisons as
//     YYYYMMDD (e.g. `publication-date>=20260801`)
//   response: { notices: [...], totalNoticeCount: number }
//
// Field IDs mix TED's legacy 2-letter codes (still supported) and newer
// eForms Business Term names - both work in the same `fields` array:
//   ND  - notice/publication number (dedupe key)
//   PD  - publication date
//   DD  - deadline-for-receipt-of-tenders date(s), array
//   CY  - buyer country, ISO 3166-1 alpha-3, array
//   TI  - notice title, keyed by 3-letter language code; TI.eng is a
//         machine-translated English title present on every notice
//         regardless of the notice's original language - used here so the
//         feed has consistent English titles instead of 24 different
//         languages depending on which country published it.
//   buyer-name         - issuing organisation, keyed by language
//   classification-cpv - CPV codes (category), array
// `links.html.ENG` (always present in the response, not a field you
// request) is the public notice detail page - used as the stored URL.
import type { ScrapedTender } from '../types';
import { TENDER_CATEGORIES } from '../../../lib/procurement/tender-categories';

const SEARCH_URL = 'https://api.ted.europa.eu/v3/notices/search';
const PAGE_SIZE = 250;
const MAX_PAGES = 10; // hard cap (2500 notices/run) - generous margin over observed steady-state daily volume

type TedNotice = {
  ND?: string;
  PD?: string;
  DD?: string[];
  CY?: string[];
  TI?: Record<string, string>;
  'buyer-name'?: Record<string, string[]>;
  'classification-cpv'?: string[];
  links?: { html?: Record<string, string> };
};

function firstValue(obj: Record<string, string | string[]> | undefined): string | undefined {
  if (!obj) return undefined;
  const val = Object.values(obj)[0];
  return Array.isArray(val) ? val[0] : val;
}

function toYyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function normalizeNotice(notice: TedNotice): ScrapedTender | null {
  const sourceId = notice.ND;
  const url = notice.links?.html?.ENG;
  const title = notice.TI?.eng ?? firstValue(notice.TI);
  if (!sourceId || !url || !title) return null;

  return {
    source: 'ted',
    sourceId,
    title,
    buyerName: firstValue(notice['buyer-name']),
    country: notice.CY?.[0],
    cpvCodes: notice['classification-cpv'] ?? [],
    publicationDate: notice.PD?.slice(0, 10),
    deadlineDate: notice.DD?.[0],
    url,
  };
}

// lookbackDays covers the daily cron's own cadence plus a small buffer so a
// missed/delayed run never silently drops a day's notices - upsertTender's
// dedupe on (source, source_id) makes re-fetching already-seen notices free.
export async function scrapeTed(lookbackDays = 2): Promise<ScrapedTender[]> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const cpvQuery = TENDER_CATEGORIES.map((c) => `classification-cpv=${c.cpvPrefix}*`).join(' OR ');
  const query = `(${cpvQuery}) AND publication-date>=${toYyyymmdd(since)}`;

  const tenders: ScrapedTender[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        page,
        limit: PAGE_SIZE,
        fields: ['ND', 'PD', 'DD', 'CY', 'TI', 'buyer-name', 'classification-cpv'],
      }),
    });

    if (!res.ok) {
      throw new Error(`TED search failed: HTTP ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { notices?: TedNotice[]; totalNoticeCount?: number };
    const notices = data.notices ?? [];
    for (const notice of notices) {
      const tender = normalizeNotice(notice);
      if (tender) tenders.push(tender);
    }

    if (notices.length < PAGE_SIZE) break; // last page
  }

  return tenders;
}
