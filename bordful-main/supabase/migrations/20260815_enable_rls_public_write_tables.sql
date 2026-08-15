-- leaks.md §4: three tables had RLS disabled with full anon/authenticated
-- CRUD grants, allowing anyone with the (public-by-design) anon key to read
-- and write job applications, employer invites, and the market-intel
-- waitlist directly via PostgREST, bypassing the app entirely.
--
-- Safe to apply with zero functional change: every read/write in the app
-- goes through the server-side service_role client, which bypasses RLS by
-- design. Enabling RLS with no policies here only denies anon/authenticated
-- — it does not touch the app's own access.
alter table public.job_application_submissions enable row level security;
alter table public.employer_candidate_invites enable row level security;
alter table public.market_intel_waitlist enable row level security;

revoke all on public.job_application_submissions,
             public.employer_candidate_invites,
             public.market_intel_waitlist
  from anon, authenticated;
