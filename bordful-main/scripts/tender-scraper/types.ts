// Normalised shape every tender source must produce.
// Maps 1-to-1 with the public.scraped_tenders DB columns.
export interface ScrapedTender {
  source: string;       // e.g. 'ted'
  sourceId: string;     // the source's own notice ID - dedupe key with `source`
  title: string;
  buyerName?: string;
  country?: string;     // ISO 3166-1 alpha-3
  cpvCodes: string[];
  publicationDate?: string; // YYYY-MM-DD
  deadlineDate?: string;    // ISO datetime
  url: string;
}
