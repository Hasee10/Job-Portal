-- One-time teardown: removes Market Intel's tables from the Supabase project
-- shared with JobLo. Finishes the code-level extraction done on 2026-07-27
-- (see market-intel/README.md) by also clearing the data side.
--
-- Irreversible - no backup was taken before this was written, per explicit
-- user confirmation. Run manually via the Supabase SQL Editor (this repo's
-- convention: migrations are never applied directly by the assistant).
--
-- Not part of market-intel/scraper/migrations/ - those define Market Intel's
-- own schema for whenever it becomes a standalone app; this is JobLo-side
-- cleanup only and has no place in that sequence.

drop table if exists market_product_matches cascade;
drop table if exists market_classified_price_history cascade;
drop table if exists market_classified_listings cascade;
drop table if exists market_alerts_sent cascade;
drop table if exists market_watchlist_items cascade;
drop table if exists market_watchlists cascade;
drop table if exists market_accounts cascade;
drop table if exists market_price_history cascade;
drop table if exists market_products cascade;
drop table if exists market_categories cascade;
drop table if exists market_platforms cascade;
