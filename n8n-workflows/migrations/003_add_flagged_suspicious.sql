-- Workflow 4: scam/low-quality flag. Suspicious jobs are still stored, just marked.
alter table public.jobs
  add column if not exists flagged_suspicious boolean not null default false;

create index if not exists jobs_flagged_suspicious_idx on public.jobs (flagged_suspicious);
