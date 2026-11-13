-- Focused regression test for backfill_scraped_tenders_cpv_divisions(),
-- against real local PostgreSQL - this procedure is invoked only through
-- psql (see the migration's own deployment comment), not through
-- supabase-js or PostgREST: CALLing a PROCEDURE is not something
-- PostgREST's RPC endpoint supports (confirmed: it answers PGRST202, "not
-- found in the schema cache", for a procedure that a plain function with
-- the same name and signature would resolve correctly). That is why this
-- is a .sql script run directly, in the pattern already established by
-- local-dev-verify-api-roles.sql, rather than a vitest test reaching the
-- procedure over HTTP through a path it is not exposed on.
--
--   psql -h 127.0.0.1 -p 5433 -U postgres -d joblo_local -f supabase/local-dev-verify-backfill-procedure.sql
--
-- Regression covered: an earlier revision selected rows to backfill with
-- `where cpv_codes <> '{}' and cpv_divisions = '{}'`. A row whose CPV
-- codes are all shorter than 2 characters (or otherwise invalid) gets
-- cpv_divisions = '{}' from the trigger correctly - there is no valid
-- division to record - which means it matches that same WHERE clause
-- again on the very next loop iteration, forever. Reproduced during review
-- (a row with cpv_codes = {'X',''} still matched after being "processed")
-- before being fixed by moving to a monotonic id cursor that does not
-- re-examine content at all. This script proves the fixed procedure
-- terminates with exactly that row present, not just that it eventually
-- produces the right answer - a bounded statement_timeout is what turns a
-- silent hang into a clear, immediate failure instead of this script
-- itself hanging.
--
-- Idempotent and self-cleaning: every row it creates is prefixed
-- ziltest-backfill-verify and deleted at the end, whether the assertions
-- pass or fail.

\set ON_ERROR_STOP on
set statement_timeout = '15s';

\echo '== seeding one pre-existing row with malformed CPV codes =='
insert into public.scraped_tenders
  (source, source_id, title, buyer_name, country, cpv_codes, publication_date, deadline_date, url, is_active)
values
  ('ted', 'ziltest-backfill-verify-malformed',
   'ziltest-backfill-verify malformed codes', 'Verify buyer', 'DEU',
   array['X', ''], current_date, now() + interval '30 days',
   'https://example.test/ziltest-backfill-verify-malformed', true)
on conflict (source, source_id) do update set cpv_codes = excluded.cpv_codes;

\echo '== a well-formed row too, so the run also proves normal rows still get backfilled =='
insert into public.scraped_tenders
  (source, source_id, title, buyer_name, country, cpv_codes, publication_date, deadline_date, url, is_active)
values
  ('ted', 'ziltest-backfill-verify-wellformed',
   'ziltest-backfill-verify wellformed codes', 'Verify buyer', 'DEU',
   array['72000000'], current_date, now() + interval '30 days',
   'https://example.test/ziltest-backfill-verify-wellformed', true)
on conflict (source, source_id) do update set cpv_codes = excluded.cpv_codes;

-- Force both rows back to "not yet backfilled", as if they predated the
-- migration - an ordinary insert already runs the trigger, so without this
-- the CALL below would have nothing to do.
update public.scraped_tenders set cpv_divisions = '{}'
where source_id in ('ziltest-backfill-verify-malformed', 'ziltest-backfill-verify-wellformed');

\echo '== CALLing the procedure, batch_size=1 so both rows need separate batches =='
call public.backfill_scraped_tenders_cpv_divisions(1);
\echo '== completed without hitting statement_timeout - this line printing is the proof of termination =='

\echo ''
\echo '== 1. the malformed row was visited (cpv_divisions = {}, not re-selectable, not an error) =='
select
  case when cpv_divisions = '{}' then 'PASS' else 'FAIL' end as verdict,
  cpv_codes, cpv_divisions
from public.scraped_tenders
where source_id = 'ziltest-backfill-verify-malformed';

\echo '== 2. the well-formed row was correctly backfilled alongside it =='
select
  case when cpv_divisions = array['72'] then 'PASS' else 'FAIL' end as verdict,
  cpv_codes, cpv_divisions
from public.scraped_tenders
where source_id = 'ziltest-backfill-verify-wellformed';

\echo '== 3. a second CALL is a clean no-op (idempotency), still bounded by the same timeout =='
call public.backfill_scraped_tenders_cpv_divisions(1);
\echo 'second CALL returned'

-- No "is anything still pending?" check here: a content-based query like
-- `where cpv_codes <> '{}' and cpv_divisions = '{}'` cannot tell a
-- malformed row's correct result (no valid division, so '{}' IS the right
-- answer) apart from one the backfill never reached - that ambiguity is
-- exactly the bug this script exists to catch, so reintroducing it in a
-- verification query here would defeat the point. Checks 1 and 2 above
-- already confirm both rows reached their correct final state, which is
-- the only thing "has this row been handled" can actually mean once a
-- malformed row's correct answer is itself empty.

\echo '== cleanup =='
delete from public.scraped_tenders
where source_id in ('ziltest-backfill-verify-malformed', 'ziltest-backfill-verify-wellformed');
select
  case when count(*) = 0 then 'PASS' else 'FAIL' end as verdict, count(*) as remaining
from public.scraped_tenders
where source_id in ('ziltest-backfill-verify-malformed', 'ziltest-backfill-verify-wellformed');
