import type { OrganizationResponsesView } from "@/lib/procurement/organization-response-actions";

// Buyer-side, server-rendered: no client interactivity needed yet since
// evaluation/award is out of scope for this milestone (M4B2). Mirrors the
// sealed/unsealed split listOrganizationResponsesForRequest returns -
// a sealed request never receives the response rows in the first place, so
// there is nothing here that could leak sealed content by accident.

export function OrganizationResponsesPanel({
  view,
}: {
  view: OrganizationResponsesView;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
        Responses
      </h2>

      {renderBody(view)}
    </section>
  );
}

function renderBody(view: OrganizationResponsesView) {
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
      {view.responses.map((response) => {
        const amount = response.pricing?.amount as string | undefined;
        const currency = response.pricing?.currency as string | undefined;
        return (
          <li
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            key={response.id}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                {response.supplierOrgName ?? "A business"}
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
          </li>
        );
      })}
    </ul>
  );
}
