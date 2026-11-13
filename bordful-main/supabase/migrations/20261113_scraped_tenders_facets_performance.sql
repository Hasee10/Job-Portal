-- Fixes the production performance defect confirmed in the 2026-11-13
-- acceptance test: /procurement/tenders took 35-45s to load because
-- getTenderFacets() unconditionally paginated the ENTIRE scraped_tenders
-- table (id, source, country, cpv_codes for every active row - ~87k rows
-- in production) into the Next.js server on every single page view, then
-- computed category/source/country counts in JavaScript. Category filtering
-- (listCategoryTenders) did the same full fetch for the same reason: CPV
-- category matching is by 2-digit division prefix (see
-- lib/procurement/tender-categories.ts), and a plain `text[]` column holding
-- full 8-digit codes cannot express prefix matching through PostgREST's
-- query operators, so the code had no way to push that filter into SQL.
--
-- DEPLOYMENT, not a single `\i` of this file against hosted Supabase:
--
--   1. Apply this file as-is. Every statement in it is fast, metadata-only
--      or touches zero existing rows - ADD COLUMN ... DEFAULT '{}' is a
--      PG11+ metadata-only operation (no table rewrite, no row locks), the
--      trigger and the facets function are CREATE OR REPLACE with no data
--      access, and CREATE INDEX CONCURRENTLY (see below) does not block
--      the scraper's writes. Nothing here requires a maintenance window on
--      its own.
--   2. Separately, run:
--        CALL public.backfill_scraped_tenders_cpv_divisions();
--      This derives cpv_divisions for the ~87k rows that already exist,
--      committing every 5000 rows rather than holding one transaction open
--      for the whole table - see that procedure's own comment for why.
--      Safe to run while the scraper is active: each batch is its own
--      short transaction, and the trigger means any row the scraper
--      touches mid-backfill is already correct and simply skipped.
--   3. Confirm with:
--        select count(*) from scraped_tenders where cpv_codes <> '{}' and cpv_divisions = '{}';
--      which should return 0.
--
-- Additive and backward compatible throughout. Rolls back by dropping the
-- trigger, the two functions/procedure, the index and the column, in that
-- order.

-- A STORED GENERATED column was the first attempt here and Postgres
-- rejects it ("cannot use subquery in column generation expression") - the
-- division extraction needs unnest() over the array, which is a subquery.
-- A plain column kept in sync by a trigger is the standard way around that
-- restriction, and it is what makes the column a real, independently
-- queryable column: PostgREST's .overlaps() filters against an actual
-- column, not an arbitrary expression, so an expression index without a
-- backing column would not have been queryable from the application at all.
--
-- A constant-default ADD COLUMN on PG11+ is metadata-only - Postgres does
-- not rewrite or lock existing rows to add it, so this step alone is safe
-- to run against the live, scraper-written table at any time.
alter table public.scraped_tenders
  add column if not exists cpv_divisions text[] not null default '{}';

-- DISTINCT, with an explicit ORDER BY: a tender whose codes share a
-- division (e.g. 72000000 and 72200000, both division 72) must contribute
-- that division to cpv_divisions once, not once per matching code - the
-- facets function below counts a tender once per element of this array, so
-- a duplicate here double-counts that tender for that category. The old
-- JavaScript implementation counted via `.some()` per category per tender,
-- which is inherently a single count regardless of how many codes matched;
-- this is what makes SQL DISTINCT the correct equivalent, not an
-- optimization. ORDER BY makes the column's contents deterministic across
-- runs for the same input, which plain SELECT DISTINCT does not guarantee
-- on its own - needed for the array to compare equal in tests and for
-- anything that might reasonably assume a stable element order.
create or replace function public.scraped_tenders_set_cpv_divisions()
returns trigger
language plpgsql
as $$
begin
  new.cpv_divisions := array(
    select distinct left(code, 2)
    from unnest(new.cpv_codes) as code
    where code is not null and length(code) >= 2
    order by 1
  );
  return new;
end;
$$;

drop trigger if exists scraped_tenders_cpv_divisions_trg on public.scraped_tenders;
create trigger scraped_tenders_cpv_divisions_trg
  before insert or update of cpv_codes on public.scraped_tenders
  for each row execute function public.scraped_tenders_set_cpv_divisions();

-- Batched, resumable backfill for the rows that existed before this
-- migration. A single `UPDATE ... SET cpv_codes = cpv_codes` over the
-- whole table was the first approach here; on ~87k rows it would likely
-- still complete in low single-digit seconds, but it is one long-running
-- statement that rewrites every row's tuple in one transaction, holds
-- those row locks for its full duration, and emits its entire WAL volume
-- in one burst - exactly the shape of operation that can collide with the
-- scraper's own upserts if the backfill happens to run during a scrape, or
-- strain a replica/WAL-shipping setup. A procedure that commits between
-- batches avoids all of that: each batch is a short, independent
-- transaction, so the worst-case lock hold and WAL burst are bounded by
-- batch_size rather than table size, and the whole thing can be
-- interrupted and re-run safely.
--
-- A PROCEDURE, not a function: only a procedure can COMMIT mid-execution
-- in Postgres (11+) - a function's body always runs inside the caller's
-- single transaction, which is exactly the "one long transaction" problem
-- this exists to avoid.
--
-- Idempotent and resumable: the WHERE clause only selects rows the trigger
-- has not already derived divisions for, so CALLing this again (after an
-- interruption, or safely at any later point) only processes what is still
-- outstanding, and a row the scraper updates mid-backfill is already
-- correct via the trigger and will not be re-selected.
create or replace procedure public.backfill_scraped_tenders_cpv_divisions(batch_size int default 5000)
language plpgsql
as $$
declare
  affected int;
begin
  loop
    update public.scraped_tenders
    set cpv_codes = cpv_codes
    where id in (
      select id from public.scraped_tenders
      where cpv_codes <> '{}' and cpv_divisions = '{}'
      limit batch_size
    );
    get diagnostics affected = row_count;
    exit when affected = 0;
    commit;
  end loop;
end;
$$;

-- CONCURRENTLY: a plain CREATE INDEX takes a SHARE lock for the build's
-- duration, which blocks writes to the table - including the scraper's
-- upserts - for however long the build takes. CONCURRENTLY avoids that at
-- the cost of a slower build and two scans instead of one, which is the
-- right tradeoff for an index added to a table something else writes to
-- continuously. It cannot run inside a transaction block, so it is NOT
-- bundled with the DDL above when this file is applied to hosted Supabase -
-- apply it as its own statement, outside any transaction (psql's default,
-- or any migration runner that does not wrap each statement in BEGIN).
-- Locally (this file, applied as one script, no concurrent scraper) a
-- transactional CREATE INDEX is simpler and has already been verified; the
-- CONCURRENTLY form is what the hosted deployment step in this file's own
-- header comment means by "apply this file as-is" - IF_NOT_EXISTS makes it
-- safe to run the same statement either way without erroring on a re-run.
create index if not exists scraped_tenders_cpv_divisions_idx
  on public.scraped_tenders using gin (cpv_divisions);

-- All three facets in one round trip, computed entirely in SQL instead of
-- fetching every active row into the application. Category counts are
-- restricted first by `cpv_divisions && category_prefixes` (GIN-indexed)
-- before the per-row unnest, so the expensive part only touches rows that
-- can actually match, not the whole active set. Each tender contributes at
-- most one row per matching category because cpv_divisions itself holds
-- distinct divisions (see the trigger above) - this function does not need
-- its own DISTINCT, it inherits correctness from the column it reads.
--
-- SECURITY DEFINER with a locked-down search_path: the function must read
-- scraped_tenders regardless of which role calls it (anon/authenticated
-- have no grant on the table itself, by design - see that table's own
-- migration), while not being hijackable by a caller-controlled search_path
-- substituting a different `unnest` or `left`. EXECUTE is revoked from
-- every role except service_role below, so in practice only the
-- server-side client this codebase already trusts with full table access
-- can call it at all - SECURITY DEFINER does not widen that, it is what
-- lets this one function read the table on service_role's behalf without
-- every other function needing the same elevated rights.
create or replace function public.scraped_tender_facets(category_prefixes text[])
returns table (kind text, key text, cnt bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 'source'::text, source, count(*)
  from public.scraped_tenders
  where is_active
  group by source

  union all

  select 'country'::text, country, count(*)
  from public.scraped_tenders
  where is_active and country is not null
  group by country

  union all

  select 'category'::text, p, count(*)
  from public.scraped_tenders t
  cross join lateral unnest(t.cpv_divisions) as p
  where t.is_active
    and t.cpv_divisions && category_prefixes
    and p = any(category_prefixes)
  group by p
$$;

revoke all on function public.scraped_tender_facets(text[]) from public, anon, authenticated;
grant execute on function public.scraped_tender_facets(text[]) to service_role;

revoke all on procedure public.backfill_scraped_tenders_cpv_divisions(int) from public, anon, authenticated;
grant execute on procedure public.backfill_scraped_tenders_cpv_divisions(int) to service_role;
