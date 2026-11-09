-- M3B: messaging between two businesses that already hold an accepted
-- buyer-supplier connection.
--
-- One table, keyed on the connection rather than on the pair of
-- organizations. That distinction matters: organization_connections carries
-- buyer_org_id and supplier_org_id separately, so the same two businesses can
-- hold two connections at once - A buying from B, and B buying from A. Keying
-- messages on a pair would silently merge those into one thread. Keying on
-- connection_id keeps each trading relationship its own conversation.
--
-- There is no separate conversation table. A conversation is just the set of
-- messages on one accepted connection, so a second table would add a join and
-- a lifecycle to manage without expressing anything the connection does not
-- already say.
--
-- Additive: no existing table, column or constraint is altered.

create table if not exists public.organization_messages (
  id uuid primary key default gen_random_uuid(),

  connection_id uuid not null
    references public.organization_connections(id) on delete cascade,

  -- The organization the message is sent on behalf of, and the individual who
  -- actually sent it. Both are recorded: the organization is what the other
  -- party sees, the member is who to attribute it to internally. member is
  -- the same (id, type) pair used by organization_members and
  -- procurement_audit_log, because this application has no single users table.
  sender_org_id uuid not null
    references public.organizations(id) on delete cascade,
  sender_member_id uuid not null,
  sender_member_type text not null
    check (sender_member_type in ('employer', 'recruiter', 'seeker')),

  body text not null,
  created_at timestamptz not null default now(),

  -- Bounded here as well as in the server action, so an oversized or empty
  -- body is rejected even if a future caller forgets to validate. btrim means
  -- a body of only whitespace counts as empty.
  constraint organization_messages_body_length
    check (char_length(btrim(body)) between 1 and 4000)
);

-- Exactly the directory query: all messages on one connection, oldest first,
-- with id breaking ties so pagination is stable when timestamps collide.
create index if not exists organization_messages_connection_created_idx
  on public.organization_messages (connection_id, created_at, id);

-- That sender_org_id is one of the connection's two parties, that the
-- connection is accepted, and that the sender is an active member of that
-- organization are all enforced in lib/procurement/message-actions.ts. They
-- are deliberately not expressed as constraints here: each depends on a row
-- in another table, which a CHECK cannot read, and the alternative - a
-- trigger - would duplicate authorization logic in a second place where it
-- could drift from the server action that actually runs first.
alter table public.organization_messages enable row level security;

revoke all on public.organization_messages from anon, authenticated;
