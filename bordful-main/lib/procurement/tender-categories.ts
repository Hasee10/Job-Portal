// Shared between the scraper (scripts/tender-scraper/sources/ted.ts) and
// the browsable feed page - one list, not duplicated. CPV division
// prefixes; proc.md's "generic engine, category-agnostic" philosophy
// applies here too, so extending coverage is adding a row, not new code.
export const TENDER_CATEGORIES: { cpvPrefix: string; label: string }[] = [
  { cpvPrefix: '72', label: 'IT services (software, consulting, support)' },
  { cpvPrefix: '79', label: 'Business services (consulting, staffing, admin)' },
  { cpvPrefix: '45', label: 'Construction' },
];
