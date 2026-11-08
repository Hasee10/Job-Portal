-- M2: the fields a public marketplace listing actually needs, added to the
-- existing organizations table rather than a parallel "supplier profile"
-- table. name, description, website, industry, company_size, location,
-- is_buyer and is_supplier already exist from M1 and are reused as-is; only
-- what was genuinely missing is added here.
--
-- Named to sort after 20261108_organization_identity.sql, which it depends
-- on ("identity" < "marketplace" lexically).
--
-- Additive and non-breaking: every column is nullable or has a default, so
-- existing rows stay valid and no application code is required to change.
--
-- is_public is the consent switch and defaults to FALSE deliberately: an
-- organization created before this migration, or created later without
-- choosing, must never appear in the public directory by default. Public
-- listing is opt-in, never inferred.
--
-- There is intentionally no verification column. Everything here is
-- self-declared by the organization, and the UI says so; adding a flag the
-- product cannot actually substantiate would just produce unearned badges.

alter table public.organizations
  add column if not exists is_public boolean not null default false,
  add column if not exists products_services text,
  add column if not exists categories text[] not null default '{}',
  add column if not exists operating_regions text[] not null default '{}',
  add column if not exists public_contact_email text;

-- Supports the directory's one mandatory predicate (is_public) combined with
-- its stable ordering, so listing and pagination are index-backed rather than
-- a filtered sort over the whole table.
create index if not exists organizations_public_name_idx
  on public.organizations (is_public, name, id);

-- The two array filters are the directory's main facets; without these each
-- one degrades to a sequential scan as the table grows.
create index if not exists organizations_categories_idx
  on public.organizations using gin (categories);
create index if not exists organizations_operating_regions_idx
  on public.organizations using gin (operating_regions);
