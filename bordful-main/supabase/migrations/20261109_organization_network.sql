-- M3A: organization member invitations and buyer-supplier connections.
--
-- Additive only. Nothing here alters organizations, organization_members or
-- any procurement table, so it can be applied to an existing database with
-- no backfill and no downtime, and rolled back by dropping two tables.
--
-- Follows the RLS pattern the rest of the schema uses: RLS enabled, zero
-- policies, grants revoked from anon and authenticated. Every read and write
-- goes through the server-side service_role client, which checks membership
-- and permissions in application code. Enabling RLS without policies is what
-- stops a caller reaching these tables directly through PostgREST.

-- ---------------------------------------------------------------------------
-- Organization invitations
-- ---------------------------------------------------------------------------
--
-- WHY A TOKEN AND NOT AN EMAIL ADDRESS.
--
-- This deployment has no email verification: lib/auth/employers.ts creates an
-- account from any address with no confirmation step, and employers has no
-- verified flag. An email address is therefore not proof of identity here. If
-- an invitation granted membership to "whoever signs in with the invited
-- address", anyone could register that address and join another company's
-- organization.
--
-- So the authority is a single-use capability token with a lifetime, and only
-- its SHA-256 hash is stored - the same shape as the existing password reset
-- flow (reset_token_hash / reset_token_expires_at), so a database leak does
-- not yield usable invitations. The inviter sees the raw token once and
-- passes it to their colleague over a channel they already trust.
--
-- invited_email is a label for the inviter's own benefit. It is never used to
-- authorize anything, which is why there is no unique constraint on it.
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  -- Display only. Never consulted when redeeming - see above.
  invited_email text,

  -- Deliberately excludes 'owner'. Ownership transfer is a different
  -- operation with different consequences (the last-owner rule below), and
  -- an invitation is accepted by whoever holds the token, so it is not the
  -- place to hand over control of a business.
  role text not null default 'member' check (role in ('admin', 'member')),

  token_hash text not null unique,
  expires_at timestamptz not null,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'declined')),

  -- The polymorphic member identity from M1, unchanged.
  invited_by_id uuid not null,
  invited_by_type text not null
    check (invited_by_type in ('employer', 'recruiter', 'seeker')),

  accepted_by_id uuid,
  accepted_by_type text
    check (accepted_by_type in ('employer', 'recruiter', 'seeker')),
  responded_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists organization_invitations_organization_idx
  on public.organization_invitations (organization_id, created_at desc);

-- The redemption lookup: by hash, among invitations still open.
create index if not exists organization_invitations_pending_idx
  on public.organization_invitations (token_hash)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Buyer-supplier connections
-- ---------------------------------------------------------------------------
--
-- One row is one trading relationship with a direction. buyer_org_id and
-- supplier_org_id are stored explicitly rather than derived from who asked,
-- because an organization can be both: the same two businesses may trade in
-- both directions, and "which of us is buying" is the question the approved
-- supplier list answers. requester_org_id records who initiated, so either
-- side can start the relationship.
create table if not exists public.organization_connections (
  id uuid primary key default gen_random_uuid(),

  requester_org_id uuid not null
    references public.organizations(id) on delete cascade,
  recipient_org_id uuid not null
    references public.organizations(id) on delete cascade,

  buyer_org_id uuid not null
    references public.organizations(id) on delete cascade,
  supplier_org_id uuid not null
    references public.organizations(id) on delete cascade,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),

  -- Free text from the requester, shown to the recipient with the request.
  message text,

  requested_by_id uuid not null,
  requested_by_type text not null
    check (requested_by_type in ('employer', 'recruiter', 'seeker')),

  responded_by_id uuid,
  responded_by_type text
    check (responded_by_type in ('employer', 'recruiter', 'seeker')),
  responded_at timestamptz,

  created_at timestamptz not null default now(),

  -- A business cannot connect to itself, by either reading.
  constraint organization_connections_distinct_parties
    check (requester_org_id <> recipient_org_id),
  constraint organization_connections_distinct_roles
    check (buyer_org_id <> supplier_org_id)
);

-- Duplicate prevention, enforced by the database rather than by a check the
-- application performs first and hopes still holds. Two requests submitted at
-- the same moment both pass an application-level "does one exist?" test; the
-- second insert here fails with 23505 instead, which the action reports as an
-- existing relationship.
--
-- Keyed on the directed pair, not the unordered one: A buying from B and B
-- buying from A are different relationships and both may exist. 'rejected' is
-- excluded so a rejection can later be asked again.
create unique index if not exists organization_connections_active_pair_idx
  on public.organization_connections (buyer_org_id, supplier_org_id)
  where status in ('pending', 'accepted');

create index if not exists organization_connections_recipient_idx
  on public.organization_connections (recipient_org_id, status, created_at desc);

create index if not exists organization_connections_requester_idx
  on public.organization_connections (requester_org_id, status, created_at desc);

-- The approved supplier network read: a buyer's accepted relationships.
create index if not exists organization_connections_buyer_accepted_idx
  on public.organization_connections (buyer_org_id, status);

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

alter table public.organization_invitations enable row level security;
alter table public.organization_connections enable row level security;

-- No policies are defined, so these two tables are unreachable for any role
-- that is subject to RLS. Nothing is granted to anon or authenticated either:
-- both the grant and the policy check must pass, and here neither does.
revoke all on public.organization_invitations,
             public.organization_connections
  from anon, authenticated;

-- service_role is the only caller, as it is for every other procurement
-- table. It holds BYPASSRLS, so the RLS above is a backstop against a future
-- grant, not the mechanism the application relies on.
grant all on public.organization_invitations,
             public.organization_connections
  to service_role;
