import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import config from "@/config";
import {
  getOrganizationForMember,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";
import { listSupplierOpportunities } from "@/lib/procurement/organization-rfq-actions";

export const metadata: Metadata = {
  description: "Procurement requests your business has been invited to.",
  title: `Opportunities | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function SupplierOpportunitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    redirect(
      `/sign-in?callbackUrl=/procurement/organizations/${id}/opportunities`
    );
  }

  const organization = await getOrganizationForMember(member, id);
  if (!organization) {
    notFound();
  }

  // Driven entirely by invitations: appearing in the public directory grants
  // nothing here.
  const opportunities = await listSupplierOpportunities(member, id);

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
            Opportunities
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Procurement requests buyers have invited this business to. You see
            these because you were invited, not because you are listed.
          </p>

          {opportunities.length === 0 ? (
            <div className="mt-8 rounded-xl border border-zinc-200 border-dashed p-10 text-center dark:border-zinc-800">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                No invitations yet
              </p>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                When a buyer you are connected to invites you to a request, it
                will appear here.
              </p>
            </div>
          ) : (
            <ul className="mt-8 space-y-3">
              {opportunities.map((opportunity) => (
                <li
                  className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
                  key={opportunity.request.id}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {opportunity.request.title}
                    </h2>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {opportunity.request.type.toUpperCase()} &middot;{" "}
                      {opportunity.invitationStatus}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                    {opportunity.request.description}
                  </p>
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {opportunity.request.category}
                    {opportunity.request.responseDeadline
                      ? ` · responses by ${new Date(opportunity.request.responseDeadline).toLocaleDateString()}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
