import { OrganizationEvaluationControls } from "@/components/procurement/OrganizationEvaluationControls";
import type { ProcurementEvaluation } from "@/lib/procurement/evaluation-actions";
import type {
  OrganizationResponsesView,
  ResponseWithSupplierOrg,
} from "@/lib/procurement/organization-response-actions";

// Buyer-side. Response content itself stays server-rendered (mirrors the
// sealed/unsealed split listOrganizationResponsesForRequest returns - a
// sealed request never receives the response rows in the first place, so
// there is nothing here that could leak sealed content by accident); only
// the evaluate/award buttons need client state, isolated in
// OrganizationEvaluationControls per response row.

export function OrganizationResponsesPanel({
  view,
  organizationId,
  requestId,
  status,
  canManage,
  evaluations,
  awardedResponseId,
}: {
  view: OrganizationResponsesView;
  organizationId: string;
  requestId: string;
  status: string;
  canManage: boolean;
  evaluations: ProcurementEvaluation[];
  awardedResponseId: string | null;
}) {
  const awardedResponse =
    !view.sealed && awardedResponseId
      ? view.responses.find((r) => r.id === awardedResponseId)
      : undefined;

  return (
    <section className="mt-8">
      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
        Responses
      </h2>

      {awardedResponse ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          Awarded to {awardedResponse.supplierOrgName ?? "a business"}.
        </p>
      ) : null}

      {renderBody(view, {
        awardedResponseId,
        canAward: canManage && status === "evaluating",
        canEvaluate: canManage && status === "evaluating",
        evaluations,
        organizationId,
        requestId,
      })}
    </section>
  );
}

function renderBody(
  view: OrganizationResponsesView,
  controls: {
    organizationId: string;
    requestId: string;
    canAward: boolean;
    canEvaluate: boolean;
    evaluations: ProcurementEvaluation[];
    awardedResponseId: string | null;
  }
) {
  if (view.sealed) {
    return (
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        This request is sealed. {view.count}{" "}
        {view.count === 1 ? "supplier has" : "suppliers have"} responded, but
        their submissions stay hidden until bids are opened.
      </p>
    );
  }
  if (view.responses.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        No responses yet.
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-3">
      {view.responses.map((response) => (
        <ResponseRow
          controls={controls}
          key={response.id}
          response={response}
        />
      ))}
    </ul>
  );
}

function ResponseRow({
  response,
  controls,
}: {
  response: ResponseWithSupplierOrg;
  controls: {
    organizationId: string;
    requestId: string;
    canAward: boolean;
    canEvaluate: boolean;
    evaluations: ProcurementEvaluation[];
    awardedResponseId: string | null;
  };
}) {
  const amount = response.pricing?.amount as string | undefined;
  const currency = response.pricing?.currency as string | undefined;
  const isWinner = response.id === controls.awardedResponseId;

  return (
    <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
          {response.supplierOrgName ?? "A business"}
          {isWinner && " · Awarded"}
        </span>
        <span className="text-xs text-zinc-500">
          {response.isWithdrawn
            ? "withdrawn"
            : new Date(response.submittedAt).toLocaleString()}
        </span>
      </div>
      {!response.isWithdrawn && (
        <>
          <p className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
            {response.proposalText}
          </p>
          {amount ? (
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {currency} {amount}
            </p>
          ) : null}
        </>
      )}
      {controls.canAward || controls.canEvaluate ? (
        <OrganizationEvaluationControls
          canAward={controls.canAward}
          canEvaluate={controls.canEvaluate}
          isWithdrawn={response.isWithdrawn}
          organizationId={controls.organizationId}
          requestId={controls.requestId}
          responseId={response.id}
          scores={controls.evaluations.filter(
            (e) => e.responseId === response.id
          )}
        />
      ) : null}
    </li>
  );
}
