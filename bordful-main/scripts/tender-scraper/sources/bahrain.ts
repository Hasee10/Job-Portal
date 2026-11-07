// Bahrain Tender Board - the Kingdom's official public-procurement listing.
// Confirmed empirically before writing this (not assumed): no robots.txt
// (the path just falls through to the site's own HTML shell, Content-Type
// text/html, not a real policy file) and the public listing itself needs no
// login/CAPTCHA (those only gate bidding/account actions, per the site's own
// nav - "eTendering Login" is separate from "Published Tenders").
//
// The listing page (https://www.tenderboard.gov.bh/Tenders/PublicTenders/)
// renders no data server-side - its "Search" button calls two JSON
// endpoints via a plain POST, confirmed live against both:
//
//   POST /Templates/TenderBoardWebService.aspx/GetCurrentPublicTenderPageCount
//   POST /Templates/TenderBoardWebService.aspx/GetCurrentPublicTenderByPage
//   body (both): { tenderNumber, ministry, category, tendertype,
//     closingDate_filter, publicTenderOnly, prequalificationOnly,
//     auctionOnly, sortingType, listPage: "mainList", Page, smeTendersOnly,
//     sectionName } - "0" means "all" for the dropdown-backed fields; Page
//     is 1-based for ByPage, "-1" for PageCount (returns total page count,
//     10 rows/page, confirmed: 47 pages = ~470 tenders at time of writing).
//   response: { d: "<html fragment>" } - the fragment, not structured JSON,
//     is literally what the page injects into the DOM; parsed below.
//
// Bahrain's own category filter only ever offers "All Categories"/"General"
// (confirmed on the live page) - no real classification to map onto
// TENDER_CATEGORIES' CPV prefixes, so cpvCodes is left empty rather than
// guessed (same honest-limitation precedent as PPRA's Goods category).
import { load } from "cheerio";
import { fetchWithRetry } from "../http";
import type { ScrapedTender } from "../types";

const BASE = "https://www.tenderboard.gov.bh";
const SERVICE_PATH = "/Templates/TenderBoardWebService.aspx";
const MAX_PAGES = 60; // headroom above the ~47 seen live; a hard stop either way

interface ListRequestBody {
  auctionOnly: string;
  category: string;
  closingDate_filter: string;
  listPage: string;
  ministry: string;
  Page: string;
  prequalificationOnly: string;
  publicTenderOnly: string;
  sectionName: string;
  smeTendersOnly: string;
  sortingType: string;
  tenderNumber: string;
  tendertype: string;
}

function baseRequestBody(page: number): ListRequestBody {
  return {
    auctionOnly: "true",
    category: "0",
    closingDate_filter: "",
    listPage: "mainList",
    ministry: "0",
    Page: String(page),
    prequalificationOnly: "false",
    publicTenderOnly: "true",
    sectionName: "0",
    smeTendersOnly: "false",
    sortingType: "0",
    tenderNumber: "",
    tendertype: "0",
  };
}

async function callWebService<T>(
  method: "GetCurrentPublicTenderPageCount" | "GetCurrentPublicTenderByPage",
  body: ListRequestBody
): Promise<T> {
  const res = await fetchWithRetry(
    `${BASE}${SERVICE_PATH}/${method}`,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent":
          "Mozilla/5.0 (compatible; Caliber-Aggregator/1.0; +https://caliber.app)",
      },
      method: "POST",
      signal: AbortSignal.timeout(20_000),
    },
    { label: "bahrain" }
  );
  if (!res.ok) {
    throw new Error(`Bahrain Tender Board request failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { d: T };
  return data.d;
}

// Both date columns mix "DD, Mon,YYYY" (Publish Date) and "DD Mon,YYYY"
// (Closing Date) formatting live - normalizing commas to spaces handles
// either. No time-of-day is shown for the closing date, so this treats it
// as end-of-day Bahrain time (UTC+3, no DST) rather than inventing a
// specific hour.
function parseBahrainDate(
  dateText: string,
  atEndOfDay: boolean
): string | undefined {
  const cleaned = dateText.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return undefined;
  }
  const time = atEndOfDay ? "23:59:59" : "00:00:00";
  const parsed = new Date(`${cleaned} ${time} GMT+0300`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function parseListFragment(html: string): ScrapedTender[] {
  const $ = load(html);
  const tenders: ScrapedTender[] = [];

  $("div.rows").each((_, row) => {
    const $row = $(row);
    const column = (label: string) =>
      $row.find(`div.column[data-label="${label}"]`).first();

    const subjectLink = column("No./Tender Subject").find("a").first();
    // The reference number shown in the UI (e.g. "BE2630000772") is NOT a
    // reliable dedup key on its own - confirmed live, at least one buyer
    // (Bahrain Polytechnic) reuses the same reference number across
    // genuinely different tenders. The href's own `id` query param (e.g.
    // "14/2026/BAPCO (BE2630000772)") is what Bahrain's own detail page
    // looks tenders up by, so that's the real unique identifier.
    const referenceNumber = subjectLink.find("span").first().text().trim();
    const fullLinkText = subjectLink.text().trim();
    const title = fullLinkText.startsWith(referenceNumber)
      ? fullLinkText.slice(referenceNumber.length).trim()
      : fullLinkText;
    const href = subjectLink.attr("href");
    const sourceId = href
      ? new URL(href, BASE).searchParams.get("id") || undefined
      : undefined;
    const buyerName = column("Purchasing Authority").text().trim();
    const publicationDateText = column("Publish Date").text().trim();
    const closingDateText = column("Closing Date").text().trim();

    if (!(sourceId && title && href)) {
      return;
    }

    tenders.push({
      buyerName: buyerName || undefined,
      country: "BHR",
      cpvCodes: [],
      deadlineDate: parseBahrainDate(closingDateText, true),
      publicationDate: parseBahrainDate(publicationDateText, false)?.slice(
        0,
        10
      ),
      source: "bahrain",
      sourceId,
      title: referenceNumber ? `${referenceNumber} — ${title}` : title,
      url: `${BASE}${href}`,
    });
  });

  return tenders;
}

export async function scrapeBahrain(): Promise<ScrapedTender[]> {
  const pageCount = await callWebService<number>(
    "GetCurrentPublicTenderPageCount",
    baseRequestBody(-1)
  );
  const pagesToFetch = Math.min(Math.max(pageCount, 0), MAX_PAGES);

  const tenders: ScrapedTender[] = [];
  for (let page = 1; page <= pagesToFetch; page += 1) {
    const fragment = await callWebService<string>(
      "GetCurrentPublicTenderByPage",
      baseRequestBody(page)
    );
    tenders.push(...parseListFragment(fragment));
  }

  return tenders;
}
