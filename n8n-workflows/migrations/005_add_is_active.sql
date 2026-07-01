-- Workflow 7: track whether a job posting is still live
alter table public.jobs
  add column if not exists is_active boolean not null default true,
  add column if not exists discontinued_at timestamptz;

create index if not exists jobs_is_active_idx on public.jobs (is_active);
