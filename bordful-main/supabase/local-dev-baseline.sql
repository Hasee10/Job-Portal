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
