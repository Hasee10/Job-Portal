import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { logAudit } from './audit-actions';
import { getRequestForBuyer } from './request-actions';

export type InvitationStatus =
  | 'invited'
  | 'prequalification_pending'
  | 'prequalification_approved'
  | 'prequalification_rejected'
  | 'viewed'
  | 'responded'
  | 'declined';

export type ProcurementInvitation = {
  id: string;
  requestId: string;
  vendorId: string;
  status: InvitationStatus;
  invitedAt: string;
  respondedAt: string | null;
};

export type InvitationWithVendor = ProcurementInvitation & {
  vendorCompanyName: string | null;
  vendorEmail: string;
};

export type InvitationWithRequest = ProcurementInvitation & {
  requestTitle: string;
  requestType: string;
  requestStatus: string;
  responseDeadline: string | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  const message = (error as { message?: string } | null)?.message;
  return new Error(message || fallback);
}

function rowToInvitation(row: Record<string, unknown>): ProcurementInvitation {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    vendorId: row.vendor_id as string,
    status: row.status as InvitationStatus,
    invitedAt: row.invited_at as string,
    respondedAt: (row.responded_at as string) || null,
  };
}

// Buyer invites one or more vendors to a request they own. Ownership is
// verified via getRequestForBuyer (which is itself query-scoped by
// buyer_id), so a stray requestId for someone else's request fails here
// rather than silently inviting vendors to it. Starting status depends on
// the request's own requires_prequalification flag - full tender-grade
// requests gate access behind an explicit approval step before a vendor
// ever sees the full spec.
export async function inviteVendors(
  buyerId: string,
  requestId: string,
  vendorIds: string[]
): Promise<ProcurementInvitation[]> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) throw new Error('Request not found.');
  if (request.visibility !== 'invite_only') {
    throw new Error('This request is open - vendors do not need to be individually invited.');
  }

  const supabase = getAdminClient();
  const startingStatus: InvitationStatus = request.requiresPrequalification
    ? 'prequalification_pending'
    : 'invited';

  const { data, error } = await supabase
    .from('procurement_invitations')
    .insert(vendorIds.map((vendorId) => ({ request_id: requestId, vendor_id: vendorId, status: startingStatus })))
    .select('*');

  if (error) {
    if (error.code === '23505') {
      throw new Error('One or more of these vendors has already been invited to this request.');
    }
    throw toError(error, 'Failed to invite vendors.');
  }

  const invitations = (data ?? []).map(rowToInvitation);
  for (const vendorId of vendorIds) {
    await logAudit(requestId, buyerId, 'employer', 'invited', { vendorId });
  }
  return invitations;
}

export async function listInvitationsForRequest(
  buyerId: string,
  requestId: string
): Promise<InvitationWithVendor[]> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) throw new Error('Request not found.');

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('procurement_invitations')
    .select('*, vendor_accounts(company_name, email)')
    .eq('request_id', requestId)
    .order('invited_at', { ascending: false });

  if (error) throw toError(error, 'Failed to load invitations.');

  return (data ?? []).map((row) => {
    const vendor = row.vendor_accounts as Record<string, unknown> | null;
    return {
      ...rowToInvitation(row),
      vendorCompanyName: (vendor?.company_name as string) || null,
      vendorEmail: (vendor?.email as string) ?? '',
    };
  });
}

// Vendor's inbox - every request they've been invited to.
export async function listVendorInvitations(vendorId: string): Promise<InvitationWithRequest[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('procurement_invitations')
    .select('*, procurement_requests(title, type, status, response_deadline)')
    .eq('vendor_id', vendorId)
    .order('invited_at', { ascending: false });

  if (error) throw toError(error, 'Failed to load invitations.');

  return (data ?? []).map((row) => {
    const request = row.procurement_requests as Record<string, unknown> | null;
    return {
      ...rowToInvitation(row),
      requestTitle: (request?.title as string) ?? '',
      requestType: (request?.type as string) ?? '',
      requestStatus: (request?.status as string) ?? '',
      responseDeadline: (request?.response_deadline as string) || null,
    };
  });
}

export async function getVendorInvitation(
  vendorId: string,
  requestId: string
): Promise<ProcurementInvitation | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('procurement_invitations')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('request_id', requestId)
    .maybeSingle();
  return data ? rowToInvitation(data) : null;
}

// Marks an invitation viewed the first time a vendor opens the request -
// only transitions from 'invited' or 'prequalification_approved', so a
// prequalification-gated vendor can't skip the approval step just by
// hitting this endpoint, and a withdrawn/declined invitation doesn't
// silently flip back to 'viewed'.
export async function markInvitationViewed(vendorId: string, requestId: string): Promise<void> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('procurement_invitations')
    .update({ status: 'viewed' })
    .eq('vendor_id', vendorId)
    .eq('request_id', requestId)
    .in('status', ['invited', 'prequalification_approved'])
    .select('id')
    .maybeSingle();

  if (data) await logAudit(requestId, vendorId, 'vendor', 'viewed');
}

export async function setPrequalificationDecision(
  buyerId: string,
  requestId: string,
  vendorId: string,
  decision: 'approved' | 'rejected'
): Promise<ProcurementInvitation> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) throw new Error('Request not found.');

  const supabase = getAdminClient();
  const nextStatus: InvitationStatus =
    decision === 'approved' ? 'prequalification_approved' : 'prequalification_rejected';

  const { data, error } = await supabase
    .from('procurement_invitations')
    .update({ status: nextStatus })
    .eq('request_id', requestId)
    .eq('vendor_id', vendorId)
    .eq('status', 'prequalification_pending')
    .select('*')
    .single();

  if (error) throw toError(error, 'Failed to record prequalification decision.');

  const invitation = rowToInvitation(data);
  await logAudit(requestId, buyerId, 'employer', 'prequalified', { vendorId, decision });
  return invitation;
}

export async function declineInvitation(vendorId: string, requestId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('procurement_invitations')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('vendor_id', vendorId)
    .eq('request_id', requestId)
    .not('status', 'in', '(responded,declined)');

  if (error) throw toError(error, 'Failed to decline invitation.');
  await logAudit(requestId, vendorId, 'vendor', 'declined');
}
