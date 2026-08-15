import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type ProcurementActorRole = 'employer' | 'recruiter' | 'vendor';

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Every mutating (and where feasible, viewing) action in the procurement
// module calls this - unconditionally, not gated behind a config flag. A
// tender-grade audit trail that can silently not happen isn't a real audit
// trail, so this is treated as required infrastructure, not an optional
// feature. Never throws into the caller's control flow: a logging failure
// must not block the underlying action, but it also must never be silently
// invisible, so it's logged to the server console at minimum.
export async function logAudit(
  requestId: string,
  actorId: string,
  actorRole: ProcurementActorRole,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from('procurement_audit_log').insert({
      request_id: requestId,
      actor_id: actorId,
      actor_role: actorRole,
      action,
      metadata: metadata ?? null,
    });
    if (error) throw error;
  } catch (error) {
    console.error(
      `[procurement audit] FAILED to log "${action}" on request ${requestId} by ${actorRole} ${actorId}:`,
      error
    );
  }
}

export type AuditLogEntry = {
  id: string;
  requestId: string;
  actorId: string;
  actorRole: ProcurementActorRole;
  action: string;
  occurredAt: string;
  metadata: Record<string, unknown> | null;
};

function rowToAuditEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    actorId: row.actor_id as string,
    actorRole: row.actor_role as ProcurementActorRole,
    action: row.action as string,
    occurredAt: row.occurred_at as string,
    metadata: (row.metadata as Record<string, unknown>) || null,
  };
}

// Buyer-facing audit trail view for a request - callers must verify the
// requester actually owns the request before calling this (no ownership
// check happens here, same division of responsibility as the rest of
// lib/jobs/*-actions.ts: ownership scoping lives in the caller/route).
export async function listAuditLog(requestId: string): Promise<AuditLogEntry[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('procurement_audit_log')
    .select('*')
    .eq('request_id', requestId)
    .order('occurred_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToAuditEntry);
}
