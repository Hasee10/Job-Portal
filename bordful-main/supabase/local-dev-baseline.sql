-- Local development baseline: the legacy tables that this repository's
-- migrations depend on but never create.
--
-- Why this file exists. `employers`, `recruiter_accounts`,
-- `job_application_submissions` and `employer_candidate_invites` predate the
-- tracked migrations folder and were created directly against the hosted
-- project, so no migration creates them. But 20260816_procurement_schema.sql
-- declares foreign keys to employers(id) and recruiter_accounts(id), and the
-- RLS migration alters the other two. On a fresh database the migrations
-- therefore fail, which is the practical face of the known history drift.
--
-- This is NOT a replica of production. It is the minimum structure needed to
-- make the tracked migrations apply and to exercise M1/M2 organization and
-- marketplace behaviour locally. Column sets are intentionally small: the
-- organization work never reads these tables, it only needs the foreign key
-- targets to exist. Do not treat it as a schema reference.
--
-- Run against the local joblo_local database only, before the migrations.

create table if not exists public.employers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  company_name text,
  created_at timestamptz not null default now()
);

-- The columns lib/auth/employers.ts actually reads and writes, so employer
-- sign-up and sign-in can be exercised locally: password_hash is written by
-- createEmployer() and read by verifyEmployerCredentials(), and the rest are
-- PROFILE_COLUMNS, selected on every employer read. Without them PostgREST
-- rejects those queries with "column employers.password_hash does not exist"
-- and no authenticated flow can run at all.
--
-- Added as ALTERs rather than in the CREATE above because "create table if
-- not exists" does nothing to a table that already exists, and this baseline
-- has already been applied to the local database. Types come from how the
-- code uses each column, not from guesswork about the hosted schema - this is
-- the minimum that makes the auth path work, not a reconstruction of it.
alter table public.employers
  add column if not exists password_hash text,
  add column if not exists website       text,
  add column if not exists logo_url      text,
  add column if not exists industry      text,
  add column if not exists company_size  text,
  add column if not exists location      text,
  add column if not exists description   text;

create table if not exists public.recruiter_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

-- Referenced only by 20260815_enable_rls_public_write_tables.sql, which is
-- not applied locally (see local-dev-apply.sql). Created anyway so that
-- migration can be applied locally later without another baseline edit.
create table if not exists public.job_application_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.employer_candidate_invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Content tables the homepage reads. Without them the hosted PostgREST
-- equivalent answers PGRST205 ("Could not find the table in the schema
-- cache") and / returns 500, so nothing in the application can be opened in
-- a browser - including the procurement pages, which are reached through it.
--
-- Every column below is taken from the data-access code, not from guesswork
-- about the hosted schema: lib/content/testimonial-actions.ts,
-- guide-actions.ts and masterclass-actions.ts are the only contract this
-- repository has for these tables. Each name appears in a row mapper, a
-- filter, an order or an insert in those files. Columns the application
-- never touches are deliberately absent rather than invented, so this is the
-- minimum that makes the pages render, not a reconstruction of production.
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author_name text not null,
  author_title text,
  author_company text,
  avatar_url text,
  -- Both read as filter and sort key: .eq("is_published", true) then
  -- .order("display_order", { ascending: true }).
  is_published boolean not null default false,
  display_order integer
);

create table if not exists public.career_guides (
  id uuid primary key default gen_random_uuid(),
  -- Looked up by slug on the guide route, and listGuideSlugs() collects them
  -- into a Set to detect duplicates, so one row per slug.
  slug text not null unique,
  title text not null,
  summary text,
  content text,
  category text,
  is_published boolean not null default false,
  published_at timestamptz,
  -- Set by the archive path, which also flips is_published back to false.
  archived_at timestamptz
);

create table if not exists public.masterclasses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  instructor_name text,
  instructor_title text,
  video_url text,
  duration_minutes integer,
  category text,
  is_published boolean not null default false,
  published_at timestamptz
);

-- The RLS pattern the migrations establish repo-wide: RLS on, zero policies,
-- no grants to anon or authenticated. These are read only by the server-side
-- service_role client, which bypasses RLS, so this denies direct PostgREST
-- access without changing how the application reads them. Without it the
-- local stack would expose unpublished drafts to an unauthenticated caller
-- the moment anon were granted anything.
alter table public.testimonials   enable row level security;
alter table public.career_guides  enable row level security;
alter table public.masterclasses  enable row level security;

revoke all on public.testimonials,
             public.career_guides,
             public.masterclasses
  from anon, authenticated;
