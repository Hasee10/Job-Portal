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
-- STAGE 1 OF 3. This file only - column, trigger, functions, procedure.
-- Deliberately contains NO index build: see
-- 20261113_scraped_tenders_cpv_divisions_index_concurrent.sql (stage 2) for
-- why that has to be its own file, run its own way, never bundled in here.
--
-- DEPLOYMENT (all three stages - see that file and the PR description for
-- the exact hosted commands):
--   1. This file. Every statement here is fast, metadata-only or touches
--      zero existing rows - ADD COLUMN ... DEFAULT '{}' is a PG11+
--      metadata-only operation (no table rewrite, no row locks), and the
--      trigger/function/procedure are CREATE OR REPLACE with no data
--      access. Safe to run through any transactional migration runner.
--   2. 20261113_scraped_tenders_cpv_divisions_index_concurrent.sql, run
--      through psql (or any plain client), NOT through a tool that wraps
--      it in a transaction - CREATE INDEX CONCURRENTLY errors if it is.
--   3. CALL public.backfill_scraped_tenders_cpv_divisions(); as a
--      standalone top-level statement, through psql - the procedure COMMITs
--      internally between batches, which a client-opened transaction
--      around the CALL would turn into an error, and a web SQL editor with
--      a query timeout may kill a multi-batch run on the full table before
--      it finishes.
--   4. Confirm with the query in that same file's closing comment.
--
-- Additive and backward compatible throughout. Rolls back by dropping the
-- trigger, the two functions, the procedure, the index (separately - see
-- stage 2) and the column, in that order.

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
-- a duplicate here double-counts that tender for that category. Confirmed
-- by reproduction during review: without DISTINCT, a tender with two
-- same-division codes moved a category's count by +2 instead of +1. The
-- old JavaScript implementation counted via `.some()` per category per
-- tender, which is inherently a single count regardless of how many codes
-- matched; this is what makes SQL DISTINCT the correct equivalent, not an
-- optimization. ORDER BY makes the column's contents deterministic across
-- runs for the same input, which plain SELECT DISTINCT does not guarantee
-- on its own.
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
-- this exists to avoid. The COMMIT inside also means CALLing this
-- procedure must itself be a top-level statement, not inside an explicit
-- BEGIN the caller opened - see stage 3 in the deployment list above.
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

-- All three facets in one round trip, computed entirely in SQL instead of
-- fetching every active row into the application. Category counts are
-- restricted first by `cpv_divisions && category_prefixes` (GIN-indexed
-- once stage 2 below has run; a sequential scan until then, which is still
-- correct, just not yet fast) before the per-row unnest, so the expensive
-- part only touches rows that can actually match, not the whole active
-- set. Each tender contributes at most one row per matching category
-- because cpv_divisions itself holds distinct divisions (see the trigger
-- above) - this function does not need its own DISTINCT, it inherits
-- correctness from the column it reads.
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
