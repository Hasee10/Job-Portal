import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrganizationRequestsPanel } from "@/components/procurement/OrganizationRequestsPanel";
import config from "@/config";
import {
  canManageOrganization,
  getOrganizationForMember,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";
import { listOrganizationRequests } from "@/lib/procurement/organization-rfq-actions";

export const metadata: Metadata = {
  description: "Procurement requests issued by your business.",
  title: `Requests | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function OrganizationRequestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    redirect(`/sign-in?callbackUrl=/procurement/organizations/${id}/requests`);
  }

  const organization = await getOrganizationForMember(member, id);
  if (!organization) {
    notFound();
  }

  const requests = await listOrganizationRequests(member, id);
  const canCreate =
    canManageOrganization(organization.role) && organization.isBuyer;

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <Link
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            href={`/procurement/organizations/${id}`}
          >
            &larr; {organization.name}
          </Link>
          <h1 className="mt-3 font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Procurement requests
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Requests this business has issued. Only the suppliers you invite can
            see them.
          </p>

          {organization.isBuyer ? null : (
            <p className="mt-6 rounded-lg border border-zinc-200 border-dashed p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              This business is not set up as a buyer, so it cannot issue
              requests. Enable the buyer capability on its profile first.
            </p>
          )}

          <div className="mt-8">
            <OrganizationRequestsPanel
              canCreate={canCreate}
              organizationId={id}
              requests={requests}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
