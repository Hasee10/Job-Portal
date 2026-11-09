import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrganizationRespondForm } from "@/components/procurement/OrganizationRespondForm";
import config from "@/config";
import {
  getOrganizationForMember,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";
import { getMyOrganizationResponse } from "@/lib/procurement/organization-response-actions";
import { listSupplierOpportunities } from "@/lib/procurement/organization-rfq-actions";
import {
  canVendorSubmitResponse,
  isSubmissionWindowOpen,
} from "@/lib/procurement/response-actions";

export const metadata: Metadata = {
  description: "Review a procurement request and submit your quotation.",
  title: `Opportunity | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function SupplierOpportunityPage({
  params,
}: {
  params: Promise<{ id: string; requestId: string }>;
}) {
  const { id, requestId } = await params;
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    redirect(
      `/sign-in?callbackUrl=/procurement/organizations/${id}/opportunities/${requestId}`
    );
  }

  const organization = await getOrganizationForMember(member, id);
  if (!organization) {
    notFound();
  }

  // Driven from the invitation list rather than a direct request lookup:
  // this organization only gets this page if it was actually invited.
  const opportunities = await listSupplierOpportunities(member, id);
  const opportunity = opportunities.find((o) => o.request.id === requestId);
  if (!opportunity) {
    notFound();
  }

  const existingResponse = await getMyOrganizationResponse(
    member,
    id,
    requestId
  );

  const window = isSubmissionWindowOpen(
    opportunity.request.status,
    opportunity.request.responseDeadline
  );
  const eligibility = canVendorSubmitResponse(
    opportunity.request.visibility,
    opportunity.invitationStatus
  );
  // Two different questions: whether a NEW submission is allowed, and
  // whether an EXISTING one can still be withdrawn. They diverge the moment
  // a response is submitted - the invitation status flips to "responded",
  // which canVendorSubmitResponse correctly refuses for a second
  // submission, but withdrawOrganizationResponse never checks invitation
  // status at all, only the submission window (see response-actions.ts).
  // Gating the withdraw button on submission eligibility hid it the instant
  // a supplier had something to withdraw - caught by driving this page in a
  // real browser, not by the integration tests, which call the actions
  // directly rather than through this page's own logic.
  const canSubmitNew = window.open && eligibility.allowed;
  const canWithdraw = window.open;
  const blockedReason = (() => {
    if (!window.open) {
      return window.reason;
    }
    return eligibility.allowed ? null : eligibility.reason;
  })();

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <Link
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            href={`/procurement/organizations/${id}/opportunities`}
          >
            &larr; Opportunities
          </Link>
          <h1 className="mt-3 font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            {opportunity.request.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {opportunity.request.type.toUpperCase()} &middot;{" "}
            {opportunity.request.status} &middot; {opportunity.request.category}
            {opportunity.request.responseDeadline
              ? ` · responses by ${new Date(opportunity.request.responseDeadline).toLocaleString()}`
              : ""}
          </p>

          <section className="mt-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
              Requirements
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
              {opportunity.request.description}
            </p>
          </section>

          <OrganizationRespondForm
            blockedReason={blockedReason}
            canSubmitNew={canSubmitNew}
            canWithdraw={canWithdraw}
            existingResponse={existingResponse}
            organizationId={id}
            requestId={requestId}
          />
        </div>
      </div>
    </main>
  );
}
