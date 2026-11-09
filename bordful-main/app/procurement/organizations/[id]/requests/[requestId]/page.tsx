import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { InviteSuppliersPanel } from "@/components/procurement/InviteSuppliersPanel";
import { OrganizationResponsesPanel } from "@/components/procurement/OrganizationResponsesPanel";
import config from "@/config";
import { listApprovedSuppliers } from "@/lib/procurement/connection-actions";
import {
  canManageOrganization,
  getOrganizationForMember,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";
import { listOrganizationResponsesForRequest } from "@/lib/procurement/organization-response-actions";
import {
  getOrganizationRequest,
  listRequestSupplierInvitations,
  OrganizationRfqError,
} from "@/lib/procurement/organization-rfq-actions";

export const metadata: Metadata = {
  description: "A procurement request issued by your business.",
  title: `Request | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function OrganizationRequestPage({
  params,
}: {
  params: Promise<{ id: string; requestId: string }>;
}) {
  const { id, requestId } = await params;
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    redirect(
      `/sign-in?callbackUrl=/procurement/organizations/${id}/requests/${requestId}`
    );
  }

  const organization = await getOrganizationForMember(member, id);
  if (!organization) {
    notFound();
  }

  // Scoped to this organization: another business's request is a 404 here,
  // whether or not the id is real.
  let request: Awaited<ReturnType<typeof getOrganizationRequest>>;
  try {
    request = await getOrganizationRequest(member, id, requestId);
  } catch (error) {
    if (error instanceof OrganizationRfqError) {
      notFound();
    }
    throw error;
  }

  const [invitations, approvedSuppliers, responsesView] = await Promise.all([
    listRequestSupplierInvitations(member, id, requestId),
    listApprovedSuppliers(member, id),
    listOrganizationResponsesForRequest(member, id, requestId),
  ]);

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <Link
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            href={`/procurement/organizations/${id}/requests`}
          >
            &larr; Procurement requests
          </Link>
          <h1 className="mt-3 font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            {request.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {request.type.toUpperCase()} &middot; {request.status} &middot;{" "}
            {request.category}
            {request.responseDeadline
              ? ` · responses by ${new Date(request.responseDeadline).toLocaleDateString()}`
              : ""}
          </p>

          <section className="mt-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
              Requirements
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
              {request.description}
            </p>
          </section>

          <InviteSuppliersPanel
            approvedSuppliers={approvedSuppliers}
            canManage={canManageOrganization(organization.role)}
            invitations={invitations}
            isDraft={request.status === "draft"}
            organizationId={id}
            requestId={requestId}
          />

          <OrganizationResponsesPanel view={responsesView} />
        </div>
      </div>
    </main>
  );
}
