import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { logAudit } from './audit-actions';
import { getRequestForBuyer } from './request-actions';

export type ProcurementEvaluation = {
  id: string;
  requestId: string;
  responseId: string;
  evaluatorId: string;
  score: number | null;
  notes: string | null;
  createdAt: string;
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

function rowToEvaluation(row: Record<string, unknown>): ProcurementEvaluation {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    responseId: row.response_id as string,
    evaluatorId: row.evaluator_id as string,
    score: (row.score as number) ?? null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
  };
}

// Explicit, buyer-triggered, audit-logged transition into evaluation. Kept
// separate from scoreResponse so "evaluation started" is its own timestamped
// event in the trail, not inferred from the first score.
export async function startEvaluation(buyerId: string, requestId: string): Promise<void> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) throw new Error('Request not found.');
  if (!['closed_for_responses', 'bids_opened'].includes(request.status)) {
    throw new Error('This request is not ready for evaluation yet.');
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from('procurement_requests')
    .update({ status: 'evaluating' })
    .eq('id', requestId)
    .eq('buyer_id', buyerId);

  if (error) throw toError(error, 'Failed to start evaluation.');
  await logAudit(requestId, buyerId, 'employer', 'evaluating');
}

export async function scoreResponse(
  buyerId: string,
  requestId: string,
  responseId: string,
  score: number | null,
  notes: string | null
): Promise<ProcurementEvaluation> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) throw new Error('Request not found.');
  if (request.status !== 'evaluating') {
    throw new Error('This request is not currently in evaluation.');
  }

  const supabase = getAdminClient();

  const { data: response } = await supabase
    .from('procurement_responses')
    .select('id')
    .eq('id', responseId)
    .eq('request_id', requestId)
    .maybeSingle();
  if (!response) throw new Error('Response not found for this request.');

  const { data, error } = await supabase
    .from('procurement_evaluations')
    .insert({ request_id: requestId, response_id: responseId, evaluator_id: buyerId, score, notes })
    .select('*')
    .single();

  if (error) throw toError(error, 'Failed to record evaluation.');

  const evaluation = rowToEvaluation(data);
  await logAudit(requestId, buyerId, 'employer', 'evaluated', { responseId, score });
  return evaluation;
}

export async function listEvaluations(
  buyerId: string,
  requestId: string
): Promise<ProcurementEvaluation[]> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) throw new Error('Request not found.');

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('procurement_evaluations')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) throw toError(error, 'Failed to load evaluations.');
  return (data ?? []).map(rowToEvaluation);
}

export async function awardRequest(
  buyerId: string,
  requestId: string,
  responseId: string
): Promise<void> {
  const request = await getRequestForBuyer(buyerId, requestId);
  if (!request) throw new Error('Request not found.');
  if (request.status !== 'evaluating') {
    throw new Error('This request must be in evaluation before it can be awarded.');
  }

  const supabase = getAdminClient();

  const { data: response } = await supabase
    .from('procurement_responses')
    .select('id, vendor_id, is_withdrawn')
    .eq('id', responseId)
    .eq('request_id', requestId)
    .maybeSingle();
  if (!response) throw new Error('Response not found for this request.');
  if (response.is_withdrawn) throw new Error('Cannot award a withdrawn response.');

  const { error } = await supabase
    .from('procurement_requests')
    .update({ status: 'awarded', awarded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('buyer_id', buyerId)
    .eq('status', 'evaluating');

  if (error) throw toError(error, 'Failed to award request.');
  await logAudit(requestId, buyerId, 'employer', 'awarded', {
    responseId,
    vendorId: response.vendor_id,
  });
}
