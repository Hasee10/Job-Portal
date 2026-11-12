# Two-pillar frontend and performance review

## Scope and compatibility
Public onboarding emphasizes Jobs and Business / Procurement. Public recruiter signup and directory promotion were removed; recruiter authentication, account records, routes, API handlers, role guards and hiring flows were not changed. Procurement pages hide job-posting controls. All supported member roles retain organization access through the membership-scoped workspace. Business onboarding preserves the organization destination after signup; ordinary legacy hiring sign-in keeps its existing default destination. Authentication consolidation remains a separate migration decision.

## Database diagnosis
Read-only inspection on 2026-11-12 confirmed the app targets the loopback REST gateway on port 3002, forwarding to standalone PostgREST on port 3001 and PostgreSQL on port 5433, database `joblo_local`. Both anonymous and service-role Jobs requests return PGRST205. Direct PostgreSQL catalog lookup returns NULL for `to_regclass('public.jobs')` and an existing `public.scraped_tenders`. The intended procurement-only local database lacks Jobs; cache refresh or privilege changes cannot supply the missing relation. No schema, credentials or hosted data were changed.

Homepage statistics read every page with a narrow projection; incomplete results on query error are discarded. The unavailable-data surface displays no fabricated global statistics. Authenticated homepage activity figures now use full server statistics instead of the bounded client preview. Company and activity statistics still require a complete narrow scan because the existing schema has no aggregate RPC. These Jobs performance improvements remain unverified against a populated Jobs environment.

## Tender retrieval
Uncategorized queries use server-side source/country/keyword filtering, exact counts, stable date-plus-ID sorting and bounded pagination. Full card fields and external URLs are fetched only for the displayed page. Keywords are quoted and LIKE metacharacters escaped to preserve literal substring behavior.

Facets require a full scan of only ID/source/country/CPV columns, paginated without the old 3,000-row ceiling and shared by React request memoization. No global personalized cache was added. Category prefix searches use that same index, read narrow sorting/search metadata in bounded ID batches, and fetch full records only for the resulting page. This preserves full coverage without migrations or oversized filter URLs. Large category searches and full facets still cost O(N); a database-side CPV aggregate/search function is a possible future schema milestone, not part of this PR.

The procurement landing now makes one exact HEAD tender-count query and no legacy vendor discovery queries. It replaces the legacy vendor count with a business-directory entry point.

## Measurements and limits
Same-process before/after retrieval against the unchanged local empty tender table, three trials each:

| Retrieval | Milliseconds | HTTP requests | Response body bytes |
| --- | --- | --- | --- |
| Original list plus facets | 77, 10, 8 | 2 each | 4 each |
| Updated list plus facets | 9, 16, 7 | 2 each | 4 each |

These empty-table timings do not establish a speed improvement. A 3,105-row regression fixture verifies exact totals, PPRA coverage beyond the old cutoff, CPV prefix matches, literal keyword punctuation, pagination and deadline ordering. Without category filters, the list path now needs one SQL query and transfers at most the page size rather than up to 3,000 full records. Facet coverage is now complete, so its request count can exceed the old incorrect bounded scan on large datasets.

A real local two-organization integration fixture measured 8 requests before versus 5 after (including membership lookup), with identical attention results and exclusion of another owner's organization. All response pages are read; errors propagate instead of being treated as zero counts. Requests batch by organization/request IDs; no private global cache is used.

Post-change development-server route checks (first request / second request, total response time, not isolated TTFB):

| Route | Status | Milliseconds |
| --- | --- | --- |
| / | 200, unavailable Jobs surface | 529 / 190 |
| /jobs | 302 to seeker sign-in | 251 / 11 |
| /procurement | 200 | 364 / 279 |
| /procurement/tenders | 200 | 273 / 203 |
| /procurement/organizations | 307 to business sign-in | 392 / 136 |

These are smoke measurements, not comparable before/after route benchmarks. No browser session credentials were supplied for authenticated route measurements; membership isolation and attention parity were verified by local integration tests instead. Seeker, business and legacy recruiter sign-in pages all returned 200. Actual OAuth login and populated Jobs benchmarks remain environment-dependent. LCP, hydration cost and interaction responsiveness were not measured, so no client bundle changes or speed claims are made.

## Verification
Changed-area tests: 16 passed across tender retrieval, organization attention and role capabilities. The expanded two-organization integration test additionally passed with measured query counts; final tender regression rerun passed 4 tests after typing cleanup. Standalone typecheck passed. Production build passed after the server retrieval and navigation changes; later edits were copy, CTA destination expressions and removal of recruiter promotional markup. Existing middleware/Edge runtime deprecation notices remain. No full suite, schema migration, deployment or merge was performed.


## Frontend follow-up: landing, motion and assets

The public homepage now renders a dedicated server-rendered `PublicLanding` before any Jobs/statistics/testimonial reads. Jobs and Procurement have equal hero entry points, dedicated feature cards and separate three-step journeys. Missing Jobs data cannot remove public marketing content. The old guest implementation was removed from the interactive job board rather than retained as a competing page.

`GuestHero` contains the illustrative HTML workflow. Its scoped CSS entrance sequence completes in about 2.1 seconds, uses opacity/transform, and disables animation and transitions for reduced motion. No animation dependency, background video, fabricated live counters or example AI match scores are used.

Original editable artwork lives in `public/illustrations/`: `jobs-pathway.svg` (2.3 KB) and `business-network.svg` (2.0 KB), with matching 960x540 PNG exports (32 KB and 39 KB). The illustrations were authored as SVG geometry and rasterized with the existing Sharp dependency. SVGs appear on the landing; PNGs appear on join and procurement. Existing logos and unrelated artwork are preserved.

Account navigation has one Business workspace destination plus the distinct Job account, Hiring workspace or Recruiter workspace destination. Desktop disclosures support Escape, focus return and closing when focus leaves. Mobile navigation supports Escape and focus return. Job-posting promotions are scoped to Jobs/hiring screens. Footer links now cover Procurement as well as Jobs. A skip link and one-main-landmark structure improve keyboard navigation.

Procurement now has a route loading state and an error boundary with the installed Next.js version's `retry` callback. They do not expose database errors or alter permissions. The primary business directory is promoted instead of the legacy vendor directory; self-declared businesses are not advertised as verified suppliers.

### Verification

- Seven focused regression tests cover public render without any Jobs queries (guest, employer and recruiter), full landing during a Jobs outage, and distinct workspace destinations for seeker/employer/recruiter.
- Headless Edge checks: one main landmark and no horizontal overflow at 320, 390, 768 and 1440 pixels; mobile menu; desktop and mobile Escape/focus return; all four hero animation names become `none` under reduced motion; no page JavaScript errors in initial route checks.
- Automated axe WCAG A/AA scans found and prompted fixes for light-mode text/button contrast. Follow-up scans returned zero violations on the landing and join in light/dark mode, and procurement in light/dark mode. These automated checks do not replace a complete manual accessibility audit.
- Network inspection found that the initial server-rendered split still shipped the job-board chunk. A small `SeekerHome` client dynamic boundary now keeps that chunk out of the public landing's requested scripts. Development script text length decreased from 5,952,048 to 4,708,899 characters in the same local setup; this is diagnostic evidence, not a production transfer-size or latency benchmark.
- Local screenshots were reviewed for desktop, mobile, dark mode, join and procurement. No production credentials, schema, role permissions or RFQ/award rules changed.
