'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { ProcurementRequest } from '@/lib/procurement/request-actions';
import type { InvitationWithVendor } from '@/lib/procurement/invitation-actions';
import type { ResponsesView, ResponseWithVendor } from '@/lib/procurement/response-actions';
import type { ProcurementEvaluation } from '@/lib/procurement/evaluation-actions';
import type { AuditLogEntry } from '@/lib/procurement/audit-actions';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  closed_for_responses: 'Closed for responses',
  bids_opened: 'Bids opened',
  evaluating: 'Evaluating',
  awarded: 'Awarded',
  cancelled: 'Cancelled',
};

async function callAction(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export function RequestDetail({ initialRequest }: { initialRequest: ProcurementRequest }) {
  const { toast } = useToast();
  const [request, setRequest] = useState(initialRequest);
  const [invitations, setInvitations] = useState<InvitationWithVendor[]>([]);
  const [responsesView, setResponsesView] = useState<ResponsesView | null>(null);
  const [evaluations, setEvaluations] = useState<ProcurementEvaluation[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [reqRes, invRes, respRes, evalRes] = await Promise.all([
      fetch(`/api/procurement/requests/${initialRequest.id}`),
      fetch(`/api/procurement/requests/${initialRequest.id}/invitations`),
      fetch(`/api/procurement/requests/${initialRequest.id}/responses`),
      fetch(`/api/procurement/requests/${initialRequest.id}/evaluations`),
    ]);
    if (reqRes.ok) setRequest((await reqRes.json()).request);
    if (invRes.ok) setInvitations((await invRes.json()).invitations);
    if (respRes.ok) setResponsesView(await respRes.json());
    if (evalRes.ok) setEvaluations((await evalRes.json()).evaluations);
  }, [initialRequest.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadAuditLog = async () => {
    const res = await fetch(`/api/procurement/requests/${initialRequest.id}/audit-log`);
    if (res.ok) setAuditLog((await res.json()).entries);
    setShowAudit(true);
  };

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (error) {
      toast({
        title: `Could not ${label}`,
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = inviteEmails
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (emails.length === 0) return;

    await runAction('invite vendors', async () => {
      const data = await callAction(`/api/procurement/requests/${initialRequest.id}/invite`, {
        vendorEmails: emails,
      });
      if (data.notFound?.length) {
        toast({
          title: 'Some emails were not found',
          description: `No Caliber recruiter account for: ${data.notFound.join(', ')}`,
        });
      }
      setInviteEmails('');
    });
  };

  const base = `/api/procurement/requests/${initialRequest.id}`;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-xl text-zinc-900 dark:text-zinc-50">{request.title}</h1>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-800">
                {request.type}
              </span>
              {request.sealedBids && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                  Sealed
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{request.category}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            {STATUS_LABEL[request.status] ?? request.status}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{request.description}</p>
        {request.responseDeadline && (
          <p className="mt-3 text-muted-foreground text-xs">
            Deadline: {new Date(request.responseDeadline).toLocaleString()}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {request.status === 'draft' && (
            <Button
              disabled={busy}
              onClick={() => runAction('publish', () => callAction(`${base}/publish`))}
              size="sm"
            >
              Publish
            </Button>
          )}
          {request.status === 'published' && (
            <Button
              disabled={busy}
              onClick={() => runAction('close for responses', () => callAction(`${base}/close`))}
              size="sm"
              variant="outline"
            >
              Close for responses
            </Button>
          )}
          {request.status === 'closed_for_responses' && request.sealedBids && (
            <Button
              disabled={busy}
              onClick={() => runAction('open bids', () => callAction(`${base}/open-bids`))}
              size="sm"
            >
              Open bids
            </Button>
          )}
          {['closed_for_responses', 'bids_opened'].includes(request.status) && (
            <Button
              disabled={busy}
              onClick={() => runAction('start evaluation', () => callAction(`${base}/start-evaluation`))}
              size="sm"
              variant="outline"
            >
              Start evaluation
            </Button>
          )}
          {!['awarded', 'cancelled'].includes(request.status) && (
            <Button
              disabled={busy}
              onClick={() => runAction('cancel', () => callAction(`${base}/cancel`))}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          )}
          <Button disabled={busy} onClick={loadAuditLog} size="sm" variant="ghost">
            {showAudit ? 'Refresh audit log' : 'View audit log'}
          </Button>
        </div>
      </div>

      {showAudit && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="font-semibold text-sm">Audit log</h2>
          <div className="mt-3 space-y-1.5">
            {auditLog.length === 0 && <p className="text-muted-foreground text-sm">No events yet.</p>}
            {auditLog.map((entry) => (
              <div className="flex items-center justify-between gap-3 text-xs" key={entry.id}>
                <span className="text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">{entry.action}</span> by {entry.actorRole}
                </span>
                <span className="text-muted-foreground">{new Date(entry.occurredAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {request.visibility === 'invite_only' && request.status !== 'cancelled' && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="font-semibold text-sm">Invited vendors</h2>
          {request.status === 'draft' || request.status === 'published' ? (
            <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleInvite}>
              <Input
                className="flex-1"
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="recruiter@company.com, another@company.com"
                value={inviteEmails}
              />
              <Button disabled={busy} type="submit">
                Invite
              </Button>
            </form>
          ) : null}

          <div className="mt-4 space-y-2">
            {invitations.length === 0 && <p className="text-muted-foreground text-sm">No vendors invited yet.</p>}
            {invitations.map((inv) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
                key={inv.id}
              >
                <div>
                  <p className="font-medium">{inv.vendorCompanyName || inv.vendorEmail}</p>
                  <p className="text-muted-foreground text-xs">{inv.status.replace(/_/g, ' ')}</p>
                </div>
                {inv.status === 'prequalification_pending' && (
                  <div className="flex gap-2">
                    <Button
                      disabled={busy}
                      onClick={() =>
                        runAction('approve prequalification', () =>
                          callAction(`${base}/invitations/${inv.vendorId}/prequalify`, { decision: 'approved' })
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      Approve
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        runAction('reject prequalification', () =>
                          callAction(`${base}/invitations/${inv.vendorId}/prequalify`, { decision: 'rejected' })
                        )
                      }
                      size="sm"
                      variant="ghost"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="font-semibold text-sm">Responses</h2>
        {responsesView?.sealed ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {responsesView.count} response{responsesView.count === 1 ? '' : 's'} submitted — sealed until you
            close for responses and open bids.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {responsesView && responsesView.responses.length === 0 && (
              <p className="text-muted-foreground text-sm">No responses yet.</p>
            )}
            {responsesView?.responses.map((r) => (
              <ResponseCard
                busy={busy}
                canAward={request.status === 'evaluating'}
                canEvaluate={request.status === 'evaluating'}
                key={r.id}
                onAward={() =>
                  runAction('award', () => callAction(`${base}/award`, { responseId: r.id }))
                }
                onEvaluate={(score, notes) =>
                  runAction('evaluate', () =>
                    callAction(`${base}/evaluations`, { responseId: r.id, score, notes })
                  )
                }
                response={r}
                scores={evaluations.filter((e) => e.responseId === r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResponseCard({
  response,
  scores,
  canEvaluate,
  canAward,
  busy,
  onEvaluate,
  onAward,
}: {
  response: ResponseWithVendor;
  scores: ProcurementEvaluation[];
  canEvaluate: boolean;
  canAward: boolean;
  busy: boolean;
  onEvaluate: (score: number | null, notes: string | null) => void;
  onAward: () => void;
}) {
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="rounded-md border border-zinc-100 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm">{response.vendorCompanyName || 'Vendor'}</p>
          <p className="text-muted-foreground text-xs">
            Submitted {new Date(response.submittedAt).toLocaleString()}
            {response.isWithdrawn && ' · Withdrawn'}
          </p>
        </div>
        {canAward && !response.isWithdrawn && (
          <Button disabled={busy} onClick={onAward} size="sm">
            Award
          </Button>
        )}
      </div>
      {response.proposalText && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{response.proposalText}</p>
      )}
      {response.pricing && (
        <pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 text-xs">
          {JSON.stringify(response.pricing, null, 2)}
        </pre>
      )}
      {scores.length > 0 && (
        <div className="mt-2 space-y-1">
          {scores.map((s) => (
            <p className="text-muted-foreground text-xs" key={s.id}>
              Score: {s.score ?? '—'} {s.notes ? `— ${s.notes}` : ''}
            </p>
          ))}
        </div>
      )}
      {canEvaluate && (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row dark:border-zinc-800">
          <Input
            className="sm:w-24"
            onChange={(e) => setScore(e.target.value)}
            placeholder="Score"
            type="number"
            value={score}
          />
          <Textarea
            className="flex-1"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={1}
            value={notes}
          />
          <Button
            disabled={busy}
            onClick={() => {
              onEvaluate(score ? Number(score) : null, notes.trim() || null);
              setScore('');
              setNotes('');
            }}
            size="sm"
            variant="outline"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
