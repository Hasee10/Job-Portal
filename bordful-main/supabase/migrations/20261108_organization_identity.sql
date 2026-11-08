-- M1: canonical organization identity for the B2B procurement marketplace.
--
-- Why a new identity rather than reusing employers/vendor_accounts:
-- an `employers` row is a login account, not a legal company — two people at
-- the same firm hold two separate employer accounts — and vendor_accounts is
-- unique per recruiter. Neither can represent "one business with several
-- authorized members", and neither can hold buyer and supplier capability at
-- once. organizations is that missing canonical entity.
--
-- Deliberately ADDITIVE. No existing column, constraint or foreign key is
-- changed, and nothing is backfilled: procurement_requests.buyer_id still
-- references employers(id) and procurement_responses.vendor_id still
-- references vendor_accounts(id). Every existing RFQ, response, invitation,
-- award and recruitment relationship keeps working untouched. Mapping legacy
-- accounts onto organizations needs a business decision (see the bridge
-- columns at the bottom) and is explicitly out of scope for this migration.
--
-- Follows the RLS pattern established repo-wide: RLS enabled, zero policies,
-- grants revoked from anon/authenticated. All access goes through the
-- server-side service_role client, which bypasses RLS by design, so this
-- denies direct PostgREST access with no functional change to the app.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  website text,
  industry text,
  company_size text,
  location text,
  -- Independent, not an enum: the whole point of the marketplace is that one
  -- business can buy and sell. The check only forbids an organization that is
  -- neither, which would have no reason to exist.
  is_buyer boolean not null default false,
  is_supplier boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_capability_required check (is_buyer or is_supplier)
);

-- Membership is polymorphic because this app has no single users table:
-- identity lives in employers, recruiter_accounts or job_seekers depending on
-- how the person signed in. procurement_audit_log already uses exactly this
-- (actor_id uuid + actor_role check) convention, so this is the established
-- pattern here rather than a new one. No FK is possible across three tables;
-- the application resolves member_id from the authenticated session only, and
-- never from client input.
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null,
  member_type text not null check (member_type in ('employer', 'recruiter', 'seeker')),
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, member_type, member_id)
);

create index if not exists organization_members_member_idx
  on public.organization_members (member_type, member_id);
create index if not exists organization_members_organization_role_idx
  on public.organization_members (organization_id, role);

-- Creating an organization and its owner membership must be one unit: an
-- organization with no owner would be unreachable and uneditable by anyone,
-- which is precisely the inconsistent authorization state onboarding must not
-- be able to produce. PostgREST cannot span two inserts in a transaction, so
-- the transaction lives here.
create or replace function public.create_organization_with_owner(
  p_name text,
  p_is_buyer boolean,
  p_is_supplier boolean,
  p_member_id uuid,
  p_member_type text,
  p_description text default null,
  p_website text default null,
  p_industry text default null,
  p_company_size text default null,
  p_location text default null
) returns public.organizations
language plpgsql
as $$
declare
  v_org public.organizations;
begin
  insert into public.organizations (
    name, description, website, industry, company_size, location,
    is_buyer, is_supplier
  )
  values (
    p_name, p_description, p_website, p_industry, p_company_size, p_location,
    p_is_buyer, p_is_supplier
  )
  returning * into v_org;

  insert into public.organization_members (
    organization_id, member_id, member_type, role
  )
  values (v_org.id, p_member_id, p_member_type, 'owner');

  return v_org;
end;
$$;

-- Bridge columns only: they let a legacy account be associated with an
-- organization later without rewriting any procurement foreign key. Nullable
-- and NOT backfilled on purpose — deriving one organization per employer row
-- would fabricate a duplicate company for every colleague holding a separate
-- account, and deriving one per vendor_account would do the same per
-- recruiter. Which legacy accounts belong to the same real business is a
-- business decision that needs production data, so it is left to a separate,
-- separately reviewable migration.
alter table public.employers
  add column if not exists organization_id uuid references public.organizations(id);
alter table public.vendor_accounts
  add column if not exists organization_id uuid references public.organizations(id);

create index if not exists employers_organization_idx
  on public.employers (organization_id);
create index if not exists vendor_accounts_organization_idx
  on public.vendor_accounts (organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

revoke all on public.organizations,
             public.organization_members
  from anon, authenticated;

revoke all on function public.create_organization_with_owner(
  text, boolean, boolean, uuid, text, text, text, text, text, text
) from anon, authenticated;
