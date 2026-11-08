-- Verify the local API roles carry the minimum privileges PostgREST needs,
-- and that RLS behaves the way the migrations intend.
--
--   psql -h 127.0.0.1 -p 5433 -U postgres -d joblo_local -f local-dev-verify-api-roles.sql
--
-- Every check is declarative - has_*_privilege() and catalogue lookups - so
-- this reads and writes nothing, creates no test rows and is safe to re-run.
-- It does NOT re-test the nine M1/M2 behavioural checks that already passed;
-- it only covers the authorization surface PostgREST newly exposes.
--
-- The model the migrations establish (see 20261108_organization_identity.sql):
-- RLS on, zero policies, grants revoked from anon/authenticated, so those two
-- roles can reach nothing. All real access is the server-side service_role
-- client, which bypasses RLS. Hosted Supabase gives service_role BYPASSRLS as
-- a role attribute; a stock PostgreSQL server does not, which is why that
-- attribute is checked here - without it service_role would be subject to RLS
-- and every query would return zero rows instead of erroring, which is the
-- kind of difference that wastes a day.

\set ON_ERROR_STOP on
\pset footer off

\echo '== role attributes =='
select
  rolname,
  rolcanlogin as can_login,
  rolinherit  as inherits,
  rolbypassrls as bypass_rls,
  rolsuper    as superuser
from pg_roles
where rolname in ('joblo_local', 'authenticator', 'anon', 'authenticated', 'service_role')
order by rolname;

\echo ''
\echo '== expected role attributes =='
select
  case when (select rolbypassrls from pg_roles where rolname='service_role')
    then 'PASS' else 'FAIL' end as service_role_bypasses_rls,
  case when (select not rolinherit and rolcanlogin from pg_roles where rolname='authenticator')
    then 'PASS' else 'FAIL' end as authenticator_noinherit_login,
  case when (select bool_and(not rolcanlogin) from pg_roles
             where rolname in ('anon','authenticated','service_role'))
    then 'PASS' else 'FAIL' end as api_roles_cannot_log_in,
  case when (select bool_and(not rolsuper and not rolcreatedb and not rolcreaterole)
             from pg_roles where rolname in ('joblo_local','authenticator'))
    then 'PASS' else 'FAIL' end as login_roles_unprivileged;

\echo ''
\echo '== RLS enabled, and no policy weakens it =='
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policy p where p.polrelid = c.oid) as policy_count,
  case when c.relrowsecurity and not exists
    (select 1 from pg_policy p where p.polrelid = c.oid)
    then 'PASS' else 'FAIL' end as verdict
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('organizations', 'organization_members')
order by c.relname;

\echo ''
\echo '== table privileges: anon/authenticated denied, service_role allowed =='
select
  t.table_name,
  r.role_name,
  has_table_privilege(r.role_name, 'public.' || t.table_name, 'select') as sel,
  has_table_privilege(r.role_name, 'public.' || t.table_name, 'insert') as ins,
  has_table_privilege(r.role_name, 'public.' || t.table_name, 'update') as upd,
  has_table_privilege(r.role_name, 'public.' || t.table_name, 'delete') as del,
  case
    when r.role_name = 'service_role' then
      case when has_table_privilege(r.role_name, 'public.' || t.table_name, 'select')
        then 'PASS' else 'FAIL' end
    else
      case when not has_table_privilege(r.role_name, 'public.' || t.table_name, 'select')
           and not has_table_privilege(r.role_name, 'public.' || t.table_name, 'insert')
           and not has_table_privilege(r.role_name, 'public.' || t.table_name, 'update')
           and not has_table_privilege(r.role_name, 'public.' || t.table_name, 'delete')
        then 'PASS' else 'FAIL' end
  end as verdict
from (values ('organizations'), ('organization_members')) as t(table_name)
cross join (values ('anon'), ('authenticated'), ('service_role')) as r(role_name)
order by t.table_name, r.role_name;

\echo ''
\echo '== schema usage: all three API roles need it for PostgREST introspection =='
select
  r.role_name,
  has_schema_privilege(r.role_name, 'public', 'usage') as usage,
  has_schema_privilege(r.role_name, 'public', 'create') as create_,
  case when has_schema_privilege(r.role_name, 'public', 'usage')
        and not has_schema_privilege(r.role_name, 'public', 'create')
    then 'PASS' else 'FAIL' end as verdict
from (values ('anon'), ('authenticated'), ('service_role')) as r(role_name);

\echo ''
\echo '== the organization RPC is callable only by service_role =='
select
  r.role_name,
  has_function_privilege(
    r.role_name,
    'public.create_organization_with_owner(text,boolean,boolean,uuid,text,text,text,text,text,text)',
    'execute') as can_execute,
  case when has_function_privilege(
         r.role_name,
         'public.create_organization_with_owner(text,boolean,boolean,uuid,text,text,text,text,text,text)',
         'execute') = (r.role_name = 'service_role')
    then 'PASS' else 'FAIL' end as verdict
from (values ('anon'), ('authenticated'), ('service_role')) as r(role_name);

\echo ''
\echo '== nothing is granted to PUBLIC, which every role would inherit =='
-- PUBLIC is not a role in pg_roles, so has_*_privilege() cannot be asked
-- about it. In an ACL a grant to PUBLIC is the entry with grantee = 0, which
-- is what these two look for. This matters for the RPC in particular:
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default, so a
-- missed revoke would leave it callable by anon through PUBLIC.
select
  case when not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join aclexplode(c.relacl) a
    where n.nspname = 'public'
      and c.relname in ('organizations', 'organization_members')
      and a.grantee = 0
  ) then 'PASS' else 'FAIL' end as tables_not_granted_to_public,
  case when not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join aclexplode(p.proacl) a
    where n.nspname = 'public'
      and p.proname = 'create_organization_with_owner'
      and a.grantee = 0
  ) then 'PASS' else 'FAIL' end as rpc_not_granted_to_public;
