// Normalised shape every tender source must produce.
// Maps 1-to-1 with the public.scraped_tenders DB columns.
export interface ScrapedTender {
  buyerName?: string;
  country?: string; // ISO 3166-1 alpha-3
  cpvCodes: string[];
  deadlineDate?: string; // ISO datetime
  publicationDate?: string; // YYYY-MM-DD
  source: string; // e.g. 'ted'
  sourceId: string; // the source's own notice ID - dedupe key with `source`
  title: string;
  url: string;
}
