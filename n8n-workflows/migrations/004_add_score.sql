-- Workflow 5: rule-based 0-100 quality score
alter table public.jobs
  add column if not exists score integer not null default 0
    check (score >= 0 and score <= 100);

create index if not exists jobs_score_idx on public.jobs (score desc);
