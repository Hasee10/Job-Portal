-- Supports the newest-first ordering lib/procurement/scraped-tender-actions.ts
-- now applies before windowing to 3000 active rows (see that function's
-- comment) - without an index on this exact sort, the ORDER BY needs a
-- full sort over the active set on every tender-listing page load, which
-- only gets more expensive as more sources are added and the table grows
-- past its current ~87k rows.
create index if not exists scraped_tenders_active_publication_idx
  on public.scraped_tenders (is_active, publication_date desc);
