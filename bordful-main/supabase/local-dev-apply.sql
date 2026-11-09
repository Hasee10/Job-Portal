-- Build the local JobLo schema and verify M1/M2 behaviour in one pass.
--
-- Run against the LOCAL joblo_local database only:
--   psql -h 127.0.0.1 -p 5433 -U postgres -d joblo_local -f local-dev-apply.sql
--
-- Applies only what M1/M2 work needs. Deliberately skipped, with reasons:
--   20260803_recruiter_candidate_digest   - recruitment digest, unrelated
--   20260815_enable_rls_public_write_tables - also alters market_intel_waitlist,
--       a table dropped from the hosted project when Market Intel was spun
--       out, so this migration no longer applies cleanly anywhere
--   n8n-workflows/migrations/*            - the jobs table, unrelated
--
-- The tender migrations below were skipped while only the database mattered.
-- They are applied now because /procurement/tenders is part of the procurement
-- frontend and returns 500 without them; both carry their own tracked DDL, so
-- applying them is exact rather than reconstructed.
--
-- Everything here is idempotent, so re-running is safe.

\set ON_ERROR_STOP on

\echo '== applying baseline and migrations =='
\ir local-dev-baseline.sql
\ir migrations/20260816_procurement_schema.sql
\ir migrations/20261108_organization_identity.sql
\ir migrations/20261108_organization_marketplace_discovery.sql
\ir migrations/20260816_scraped_tenders.sql
\ir migrations/20261107_scraped_tenders_publication_order_idx.sql
\ir migrations/20261109_organization_network.sql

-- Objects are created by the superuser running this script; hand usage to the
-- unprivileged development role so the application can work as joblo_local.
grant usage on schema public to joblo_local;
grant all on all tables in schema public to joblo_local;
grant all on all sequences in schema public to joblo_local;
grant execute on all functions in schema public to joblo_local;
alter default privileges in schema public grant all on tables to joblo_local;

\echo ''
\echo '== 1. schema present =='
select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='organizations') as t_organizations,
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='organization_members') as t_members,
  (select count(*) from pg_proc where proname='create_organization_with_owner') as rpc,
  (select count(*) from information_schema.columns where table_schema='public'
     and table_name='organizations'
     and column_name in ('is_public','products_services','categories',
                         'operating_regions','public_contact_email')) as m2_columns,
  (select column_default from information_schema.columns where table_schema='public'
     and table_name='organizations' and column_name='is_public') as is_public_default;

\echo ''
\echo '== 2. RPC privileges (anon/authenticated must be false) =='
select
  has_function_privilege('anon','public.create_organization_with_owner(text,boolean,boolean,uuid,text,text,text,text,text,text)','execute') as anon_exec,
  has_function_privilege('authenticated','public.create_organization_with_owner(text,boolean,boolean,uuid,text,text,text,text,text,text)','execute') as authenticated_exec,
  has_function_privilege('service_role','public.create_organization_with_owner(text,boolean,boolean,uuid,text,text,text,text,text,text)','execute') as service_role_exec;

\echo ''
\echo '== 3. seeding synthetic organizations =='
select public.create_organization_with_owner('ZZ Local Alpha', true,  false, '00000000-0000-4000-8000-00000000b001','employer');
select public.create_organization_with_owner('ZZ Local Beta',  false, true,  '00000000-0000-4000-8000-00000000b002','recruiter');
select public.create_organization_with_owner('ZZ Local Gamma', true,  true,  '00000000-0000-4000-8000-00000000b003','employer');

update public.organizations set is_public=true, categories=array['steel'],
  operating_regions=array['Pakistan'], products_services='Structural steel supply'
  where name='ZZ Local Alpha';
update public.organizations set is_public=true, categories=array['software'],
  operating_regions=array['UAE'], products_services='Custom software development'
  where name='ZZ Local Beta';
update public.organizations set is_public=true, categories=array['steel','software'],
  operating_regions=array['Pakistan','UAE'], products_services='Steel and software'
  where name='ZZ Local Gamma';

\echo ''
\echo '== 4. owner membership is atomic (each must be 1 member / 1 owner) =='
select o.name, o.is_buyer, o.is_supplier,
  (select count(*) from public.organization_members m where m.organization_id=o.id) as members,
  (select count(*) from public.organization_members m where m.organization_id=o.id and m.role='owner') as owners
from public.organizations o where o.name like 'ZZ Local%' order by o.name;

\echo ''
\echo '== 5. discovery filters, all three public =='
select
  (select string_agg(name,' | ' order by name,id) from public.organizations where is_public and is_buyer) as capability_buyer,
  (select string_agg(name,' | ' order by name,id) from public.organizations where is_public and is_supplier) as capability_supplier,
  (select string_agg(name,' | ' order by name,id) from public.organizations where is_public and categories @> array['steel']) as category_steel,
  (select string_agg(name,' | ' order by name,id) from public.organizations where is_public and operating_regions @> array['UAE']) as region_uae,
  (select string_agg(name,' | ' order by name,id) from public.organizations
     where is_public and (name ilike '%software%' or products_services ilike '%software%')) as keyword_software;

\echo ''
\echo '== 6. private organization disappears from every public query =='
update public.organizations set is_public=false where name='ZZ Local Gamma';
select
  (select string_agg(name,' | ' order by name,id) from public.organizations where is_public and name like 'ZZ Local%') as public_now,
  (select string_agg(name,' | ' order by name,id) from public.organizations where is_public and is_buyer) as buyer_now,
  (select string_agg(name,' | ' order by name,id) from public.organizations where is_public and categories @> array['steel']) as steel_now,
  (select string_agg(name,' | ' order by name,id) from public.organizations where is_public and name ilike '%gamma%') as gamma_by_name,
  (select count(*) from public.organization_members) as member_rows_exist;

\echo ''
\echo '== 7. stable pagination over the public set =='
select
  (select name from public.organizations where is_public order by name,id limit 1 offset 0) as page1,
  (select name from public.organizations where is_public order by name,id limit 1 offset 1) as page2,
  (select count(*) from public.organizations where is_public) as total;

\echo ''
\echo '== 8. capability constraint rejects an organization that is neither =='
do $$
begin
  perform public.create_organization_with_owner('ZZ Local Invalid', false, false,
    '00000000-0000-4000-8000-00000000b009','employer');
  raise notice 'FAIL: an organization with neither capability was accepted';
exception when check_violation then
  raise notice 'PASS: rejected by organizations_capability_required';
end
$$;

select count(*) as invalid_rows_left from public.organizations where name='ZZ Local Invalid';

\echo ''
\echo '== 9. cleanup =='
delete from public.organizations where name like 'ZZ Local%';
select
  (select count(*) from public.organizations) as organizations_remaining,
  (select count(*) from public.organization_members) as members_remaining;
