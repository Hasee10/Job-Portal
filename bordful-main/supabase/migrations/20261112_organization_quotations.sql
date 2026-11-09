-- M4B1: let a supplier organization submit a quotation against an
-- organization-owned (or legacy) procurement request, using the same bridge
-- pattern as 20261111_organization_owned_rfqs.sql.
--
-- procurement_responses gains supplier_org_id, nullable, with vendor_id
-- relaxed from NOT NULL and an XOR check: a response is owned by EITHER a
-- legacy vendor_account OR a supplier organization, never both and never
-- neither. No synthetic vendor_account is created for an organization that
-- never had one - that would invent a legacy identity and corrupt the
-- unique (request_id, vendor_id) history.
--
-- Historical responses are untouched: every existing row keeps its
-- vendor_id and satisfies the new check unchanged. Evaluations, the audit
-- log, sealed-bid handling, deadlines and state transitions are not
-- modified by this migration.

alter table public.procurement_responses
  add column if not exists supplier_org_id uuid references public.organizations(id);

alter table public.procurement_responses
  alter column vendor_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'procurement_responses_one_supplier_identity'
  ) then
    alter table public.procurement_responses
      add constraint procurement_responses_one_supplier_identity
      check (num_nonnulls(vendor_id, supplier_org_id) = 1);
  end if;
end
$$;

-- The existing unique (request_id, vendor_id) does not catch two
-- organization responses to the same request, since NULL vendor_id values
-- never collide. This partial unique index is what prevents a supplier
-- organization submitting twice - the same role the index plays for
-- organization invitations in the M4A migration.
create unique index if not exists procurement_responses_request_supplier_org_idx
  on public.procurement_responses (request_id, supplier_org_id)
  where supplier_org_id is not null;

-- The one query this milestone actually runs: a supplier organization
-- looking up its own response to a request.
create index if not exists procurement_responses_supplier_org_idx
  on public.procurement_responses (supplier_org_id)
  where supplier_org_id is not null;
