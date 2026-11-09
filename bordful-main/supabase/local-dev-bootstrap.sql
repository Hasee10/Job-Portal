-- Local development bootstrap for a NATIVE PostgreSQL 16 server.
--
-- Run once, as a superuser, against the "postgres" database:
--   psql -h 127.0.0.1 -U postgres -d postgres -f local-dev-bootstrap.sql
--
-- Then set the development role's password interactively (never in a file):
--   psql -h 127.0.0.1 -U postgres -d postgres -c "\password joblo_local"
--
-- Scope: this creates one database and four roles and touches nothing else.
-- Every statement is guarded, so re-running it is safe and it will not alter
-- an existing database, role or pg_hba.conf. Other projects on this server
-- are unaffected.

\set ON_ERROR_STOP on

-- Supabase's hosted database defines these three roles, and the repository's
-- migrations reference them directly (revoke ... from anon, authenticated /
-- grant ... to service_role). A stock PostgreSQL server has no such roles, so
-- the migrations would fail here without them. NOLOGIN: they exist only as
-- grant targets, nothing ever connects as them.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;

-- The development login. Deliberately unprivileged: it can log in and own its
-- own database, and that is all - no SUPERUSER, CREATEDB, CREATEROLE or
-- REPLICATION, so it cannot reach or alter anything else on this server.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'joblo_local') then
    create role joblo_local login;
  end if;
end
$$;

-- CREATE DATABASE cannot run inside a DO block, so it is guarded with \gexec.
select 'create database joblo_local owner joblo_local'
where not exists (select 1 from pg_database where datname = 'joblo_local')
\gexec

-- Keep the new database private to its owner rather than every role on this
-- shared server. This only narrows access to joblo_local.
revoke all on database joblo_local from public;
