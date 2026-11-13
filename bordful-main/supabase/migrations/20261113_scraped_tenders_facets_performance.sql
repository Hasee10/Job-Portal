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
-- Additive and backward compatible: one derived column, a trigger that
-- keeps it in sync, an index, and a facets function. Nothing existing is
-- altered. Rolls back by dropping the trigger, the function, the index and
-- the column, in that order.

-- A STORED GENERATED column was the first attempt here and Postgres
-- rejects it ("cannot use subquery in column generation expression") - the
-- division extraction needs unnest() over the array, which is a subquery.
-- A plain column kept in sync by a trigger is the standard way around that
-- restriction, and it is what makes the column a real, independently
-- queryable column: PostgREST's .overlaps() filters against an actual
-- column, not an arbitrary expression, so an expression index without a
-- backing column would not have been queryable from the application at all.
alter table public.scraped_tenders
  add column if not exists cpv_divisions text[] not null default '{}';

create or replace function public.scraped_tenders_set_cpv_divisions()
returns trigger
language plpgsql
as $$
begin
  new.cpv_divisions := array(
    select left(code, 2)
    from unnest(new.cpv_codes) as code
    where code is not null and length(code) >= 2
  );
  return new;
end;
$$;

drop trigger if exists scraped_tenders_cpv_divisions_trg on public.scraped_tenders;
create trigger scraped_tenders_cpv_divisions_trg
  before insert or update of cpv_codes on public.scraped_tenders
  for each row execute function public.scraped_tenders_set_cpv_divisions();

-- Backfill existing rows. Writing cpv_codes to itself fires the trigger
-- above without changing any stored data otherwise, so this is safe to
-- re-run and does not touch publication/deadline/is_active or anything the
-- scraper's own upsert cares about.
update public.scraped_tenders set cpv_codes = cpv_codes;

-- Lets .overlaps('cpv_divisions', prefixes) resolve as an index scan
-- instead of a sequential scan, the same way the existing GIN index on
-- cpv_codes already does for other array lookups on this table.
create index if not exists scraped_tenders_cpv_divisions_idx
  on public.scraped_tenders using gin (cpv_divisions);

-- All three facets in one round trip, computed entirely in SQL instead of
-- fetching every active row into the application. Category counts are
-- restricted first by `cpv_divisions && category_prefixes` (GIN-indexed)
-- before the per-row unnest, so the expensive part only touches rows that
-- can actually match, not the whole active set.
--
-- SECURITY DEFINER with a locked-down search_path: the function must read
-- scraped_tenders regardless of which role calls it (anon/authenticated
-- have no grant on the table itself, by design - see that table's own
-- migration), while not being hijackable by a caller-controlled search_path
-- substituting a different `unnest` or `left`.
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
