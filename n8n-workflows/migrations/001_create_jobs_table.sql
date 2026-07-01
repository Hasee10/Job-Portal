-- Workflow 1: base jobs table for the n8n job collector
-- Run this in Supabase SQL editor before importing workflows/01-job-collector.json

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  location text,
  remote_type text,           -- 'remote' | 'hybrid' | 'onsite' | 'unknown'
  apply_url text not null,
  source text not null,       -- 'remotive' | 'arbeitnow' | ...
  description text,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Dedupe key: one row per unique apply_url
create unique index if not exists jobs_apply_url_key on public.jobs (apply_url);

-- Fast lookups for the collector's "does this already exist" check
create index if not exists jobs_source_idx on public.jobs (source);
create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc);
