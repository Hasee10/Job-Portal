// Shared between the scraper (scripts/tender-scraper/sources/ted.ts) and
// the browsable feed page - one list, not duplicated. CPV division
// prefixes; proc.md's "generic engine, category-agnostic" philosophy
// applies here too, so extending coverage is adding a row, not new code.
// Verified against the live TED API before adding (query classification-cpv
// against each division, confirmed real matching notices - not assumed from
// the CPV spec alone). PPRA's own category taxonomy (Goods/Works/
// Consultancy/Non-consultancy) is coarser than CPV divisions and doesn't
// map cleanly onto 71/80/85 specifically - those three are TED-only for now,
// same honest limitation already noted in ppra.ts for 79 vs 45.
export const TENDER_CATEGORIES: { cpvPrefix: string; label: string }[] = [
  { cpvPrefix: '72', label: 'IT services (software, consulting, support)' },
  { cpvPrefix: '79', label: 'Business services (consulting, staffing, admin)' },
  { cpvPrefix: '45', label: 'Construction' },
  { cpvPrefix: '71', label: 'Architecture and engineering services' },
  { cpvPrefix: '80', label: 'Education and training services' },
  { cpvPrefix: '85', label: 'Health and social work services' },
];
