-- Workflow 3: entry-level flag
alter table public.jobs
  add column if not exists entry_level boolean not null default false;

create index if not exists jobs_entry_level_idx on public.jobs (entry_level);
