-- M4A: let a canonical organization own a procurement request and invite
-- supplier organizations, without disturbing the legacy employer/vendor
-- records already in the table.
--
-- The bridge is two nullable columns and two XOR checks. A request is owned
-- by EITHER a legacy employer (buyer_id) OR an organization (buyer_org_id),
-- never both and never neither; an invitation names EITHER a legacy
-- vendor_account (vendor_id) OR a supplier organization (supplier_org_id).
--
-- Why buyer_id and vendor_id lose NOT NULL rather than gaining a synthetic
-- row: the alternative is minting a placeholder employer and vendor_account
-- for every organization, which would invent legacy identities that never
-- existed and quietly corrupt the audit trail. Dropping NOT NULL widens what
-- the column accepts and changes no existing row.
--
-- Legacy records are untouched and keep working unchanged: every historical
-- request still has its buyer_id, every historical invitation its vendor_id,
-- and the XOR check is satisfied by exactly those values. Responses,
-- evaluations, the audit log, sealed-bid handling and the deadline/state
-- transitions are not modified by this migration at all.

alter table public.procurement_requests
  add column if not exists buyer_org_id uuid references public.organizations(id);

alter table public.procurement_invitations
  add column if not exists supplier_org_id uuid references public.organizations(id);

alter table public.procurement_requests
  alter column buyer_id drop not null;

alter table public.procurement_invitations
  alter column vendor_id drop not null;

-- Constraints are added defensively: ADD CONSTRAINT has no IF NOT EXISTS, and
-- this migration must stay re-runnable like the rest of the folder.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'procurement_requests_one_buyer_identity'
  ) then
    alter table public.procurement_requests
      add constraint procurement_requests_one_buyer_identity
      check (num_nonnulls(buyer_id, buyer_org_id) = 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'procurement_invitations_one_supplier_identity'
  ) then
    alter table public.procurement_invitations
      add constraint procurement_invitations_one_supplier_identity
      check (num_nonnulls(vendor_id, supplier_org_id) = 1);
  end if;
end
$$;

-- procurement_audit_log.actor_role was written when only employers,
-- recruiters and standalone vendors could act on a request. Organization
-- membership is wider than that: since M1 any authenticated account can own
-- a business, including one whose recruitment role is 'seeker', and M2
-- settled that organization capability rather than legacy role decides what
-- a business may do. Such an owner issuing an RFQ would otherwise violate
-- this CHECK at runtime.
--
-- Widening only - 'seeker' is added, nothing is removed, and every existing
-- audit row still satisfies it. The alternative, recording a seeker as an
-- 'employer', would put a false actor in a compliance trail.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'procurement_audit_log_actor_role_check'
  ) then
    alter table public.procurement_audit_log
      drop constraint procurement_audit_log_actor_role_check;
  end if;
  alter table public.procurement_audit_log
    add constraint procurement_audit_log_actor_role_check
    check (actor_role in ('employer', 'recruiter', 'vendor', 'seeker'));
end
$$;

-- The existing unique (request_id, vendor_id) no longer covers organization
-- invitations, because NULL vendor_id values do not collide. This partial
-- index is what stops the same supplier organization being invited twice to
-- one request.
create unique index if not exists procurement_invitations_request_supplier_org_idx
  on public.procurement_invitations (request_id, supplier_org_id)
  where supplier_org_id is not null;

-- The two queries M4A actually runs: a buyer listing its own requests, and a
-- supplier listing the requests it has been invited to.
create index if not exists procurement_requests_buyer_org_status_idx
  on public.procurement_requests (buyer_org_id, status)
  where buyer_org_id is not null;

create index if not exists procurement_invitations_supplier_org_idx
  on public.procurement_invitations (supplier_org_id, status)
  where supplier_org_id is not null;
