-- External tender aggregation (client request: browse global tenders by
-- category, updated daily - separate concept from procurement_requests,
-- which are requests buyers create themselves on Caliber and invite
-- specific vendors to). First source: TED (EU Tenders Electronic Daily),
-- more sources land in this same table later without a schema change.
--
-- Deliberately NOT given an anon SELECT policy the way public.jobs is -
-- checked that table's grants while building this and found anon holds
-- full INSERT/UPDATE/DELETE/TRUNCATE on it (flagged separately, needs its
-- own fix). Reads for this table go through the Next.js server via the
-- service-role client only, same as every other procurement table - no
-- direct PostgREST access from the browser at all, so there's no anon-grant
-- footgun to get wrong here in the first place.
create table if not exists public.scraped_tenders (
  id uuid primary key default gen_random_uuid(),
  source text not null,                    -- e.g. 'ted'
  source_id text not null,                 -- e.g. TED's publication-number - dedupe key with `source`
  title text not null,
  buyer_name text,
  country text,                            -- ISO 3166-1 alpha-3, e.g. 'DEU'
  cpv_codes text[] not null default '{}',  -- category codes, e.g. {'72000000'} for IT services
  publication_date date,
  deadline_date timestamptz,
  url text not null,                       -- link to the original notice
  is_active boolean not null default true, -- flipped false once the deadline passes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists scraped_tenders_active_deadline_idx
  on public.scraped_tenders (is_active, deadline_date);
create index if not exists scraped_tenders_cpv_codes_idx
  on public.scraped_tenders using gin (cpv_codes);
create index if not exists scraped_tenders_country_idx
  on public.scraped_tenders (country);

alter table public.scraped_tenders enable row level security;

revoke all on public.scraped_tenders from anon, authenticated;
