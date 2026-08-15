-- Procurement / RFx engine (see proc.md) — Phase 1, full tender-grade.
--
-- One generic engine backs all four request types (rfi/rfq/rfp/tender);
-- strictness (sealed bids, prequalification) is per-request config, not a
-- separate schema per type, per proc.md §3.
--
-- vendor_accounts is deliberately category-agnostic (proc.md §4.3): a
-- recruiter can act as a vendor via the nullable recruiter_id link with no
-- separate signup, while still leaving room for non-recruiter vendor
-- categories later without a schema migration. password_hash is only used
-- for that future standalone path — Phase 1 only populates recruiter-linked
-- rows.
--
-- All tables follow the only RLS pattern established in this repo: RLS
-- enabled, zero policies, grants revoked from anon/authenticated. Every
-- read/write goes through the server-side service_role client, which
-- bypasses RLS by design — this denies direct PostgREST access with no
-- functional change to the app itself.

create table if not exists public.vendor_accounts (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid unique references public.recruiter_accounts(id),
  email text not null unique,
  password_hash text,
  company_name text,
  categories text[] not null default '{}',
  website text,
  industry text,
  company_size text,
  location text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.procurement_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.employers(id),
  type text not null check (type in ('rfi', 'rfq', 'rfp', 'tender')),
  category text not null,
  title text not null,
  description text not null,
  spec_fields jsonb not null default '[]',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed_for_responses', 'bids_opened', 'evaluating', 'awarded', 'cancelled')),
  visibility text not null default 'invite_only' check (visibility in ('open', 'invite_only')),
  sealed_bids boolean not null default false,
  requires_prequalification boolean not null default false,
  response_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  awarded_at timestamptz
);

create table if not exists public.procurement_invitations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendor_accounts(id),
  status text not null default 'invited'
    check (status in ('invited', 'prequalification_pending', 'prequalification_approved',
                       'prequalification_rejected', 'viewed', 'responded', 'declined')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, vendor_id)
);

create table if not exists public.procurement_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendor_accounts(id),
  invitation_id uuid references public.procurement_invitations(id),
  pricing jsonb,
  proposal_text text,
  proposal_document_path text,
  submitted_at timestamptz not null default now(),
  is_withdrawn boolean not null default false,
  unique (request_id, vendor_id)
);

create table if not exists public.procurement_evaluations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  response_id uuid not null references public.procurement_responses(id) on delete cascade,
  evaluator_id uuid not null references public.employers(id),
  score numeric,
  notes text,
  created_at timestamptz not null default now()
);

-- Always written, unconditionally, from every mutating action — full
-- tender-grade compliance means the audit trail is not an optional feature.
create table if not exists public.procurement_audit_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('employer', 'recruiter', 'vendor')),
  action text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists procurement_requests_buyer_status_idx
  on public.procurement_requests (buyer_id, status);

create index if not exists procurement_invitations_request_idx
  on public.procurement_invitations (request_id);
create index if not exists procurement_invitations_vendor_status_idx
  on public.procurement_invitations (vendor_id, status);

create index if not exists procurement_responses_request_idx
  on public.procurement_responses (request_id);
create index if not exists procurement_responses_vendor_idx
  on public.procurement_responses (vendor_id);

create index if not exists procurement_evaluations_request_idx
  on public.procurement_evaluations (request_id);
create index if not exists procurement_evaluations_response_idx
  on public.procurement_evaluations (response_id);

create index if not exists procurement_audit_log_request_occurred_idx
  on public.procurement_audit_log (request_id, occurred_at);

alter table public.vendor_accounts enable row level security;
alter table public.procurement_requests enable row level security;
alter table public.procurement_invitations enable row level security;
alter table public.procurement_responses enable row level security;
alter table public.procurement_evaluations enable row level security;
alter table public.procurement_audit_log enable row level security;

revoke all on public.vendor_accounts,
             public.procurement_requests,
             public.procurement_invitations,
             public.procurement_responses,
             public.procurement_evaluations,
             public.procurement_audit_log
  from anon, authenticated;
