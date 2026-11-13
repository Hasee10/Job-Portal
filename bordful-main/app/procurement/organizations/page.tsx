import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrganizationForm } from "@/components/procurement/OrganizationForm";
import config from "@/config";
import { isLocalPresentationRequest } from "@/lib/auth/local-presentation";
import {
  listOrganizationsWithAttention,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";
import { listOrganizationRequests } from "@/lib/procurement/organization-rfq-actions";

export const metadata: Metadata = {
  description:
    "Create and manage the businesses you represent on the procurement marketplace.",
  title: `Procurement dashboard | ${config.title}`,
};

export const dynamic = "force-dynamic";

function capabilityLabel(isBuyer: boolean, isSupplier: boolean): string {
  if (isBuyer && isSupplier) {
    return "Buyer and supplier";
  }
  return isBuyer ? "Buyer" : "Supplier";
}

export default async function OrganizationsPage() {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    const hostname = (await headers()).get("host") ?? "";
    if (isLocalPresentationRequest(`http://${hostname}`)) {
      redirect("/demo");
    }
    redirect("/sign-in?callbackUrl=/procurement/organizations");
  }

  const organizations = await listOrganizationsWithAttention(member);
  const requests = (
    await Promise.all(
      organizations
        .filter((organization) => organization.isBuyer)
        .map(async (organization) =>
          (
            await listOrganizationRequests(member, organization.id)
          ).map((request) => ({
            ...request,
            organizationId: organization.id,
            organizationName: organization.name,
          }))
        )
    )
  ).flat();
  const metrics = [
    { label: "Procurement requests", value: requests.length },
    {
      label: "Open for quotations",
      value: requests.filter((request) => request.status === "published")
        .length,
    },
    {
      label: "In evaluation",
      value: requests.filter((request) => request.status === "evaluating")
        .length,
    },
    {
      label: "Awarded",
      value: requests.filter((request) => request.status === "awarded").length,
    },
  ];
  const recentRequests = [...requests]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Procurement dashboard
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Track sourcing, review quotations and manage your business
            relationships.
          </p>

          {organizations.length > 0 && (
            <>
              <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <div
                    className="rounded-xl border bg-card p-5"
                    key={metric.label}
                  >
                    <dt className="text-muted-foreground text-sm">
                      {metric.label}
                    </dt>
                    <dd className="mt-2 font-semibold text-3xl tracking-tight">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "New supplier invitations",
                    value: organizations.reduce(
                      (sum, org) => sum + org.attention.openInvitations,
                      0
                    ),
                  },
                  {
                    label: "Pending connections",
                    value: organizations.reduce(
                      (sum, org) => sum + org.attention.pendingConnections,
                      0
                    ),
                  },
                  {
                    label: "Quotations to review",
                    value: organizations.reduce(
                      (sum, org) => sum + org.attention.pendingQuotations,
                      0
                    ),
                  },
                ].map((item) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4"
                    key={item.label}
                  >
                    <span className="text-muted-foreground text-sm">
                      {item.label}
                    </span>
                    <span className="font-semibold text-xl">{item.value}</span>
                  </div>
                ))}
              </div>
              {recentRequests.length > 0 && (
                <section className="mt-8 rounded-xl border bg-card p-5">
                  <h2 className="font-semibold text-lg">
                    Recent procurement requests
                  </h2>
                  <div className="mt-4 divide-y">
                    {recentRequests.map((request) => (
                      <Link
                        className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-primary"
                        href={`/procurement/organizations/${request.organizationId}/requests/${request.id}`}
                        key={request.id}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block break-words font-medium">
                            {request.title}
                          </span>
                          <span className="mt-1 block text-muted-foreground text-xs">
                            {request.organizationName} ·{" "}
                            {request.type.toUpperCase()}
                          </span>
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">
                          {request.status.replaceAll("_", " ")}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              <h2 className="mt-8 font-semibold text-xl">Your businesses</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Choose a business to manage its requests, opportunities and
                connections.
              </p>
            </>
          )}

          {organizations.length > 0 && (
            <ul className="mt-8 space-y-3">
              {organizations.map((organization) => {
                const needsAttention =
                  organization.attention.pendingConnections +
                  organization.attention.openInvitations +
                  organization.attention.pendingQuotations;
                return (
                  <li key={organization.id}>
                    <Link
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                      href={`/procurement/organizations/${organization.id}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-semibold text-zinc-900 dark:text-zinc-50">
                          {organization.name}
                        </span>
                        <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">
                          {capabilityLabel(
                            organization.isBuyer,
                            organization.isSupplier
                          )}{" "}
                          &middot; you are {organization.role}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        {needsAttention > 0 && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-800 text-xs dark:bg-amber-950/60 dark:text-amber-300">
                            {needsAttention} needs attention
                          </span>
                        )}
                        <Building2
                          aria-hidden="true"
                          className="h-5 w-5 text-zinc-400"
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
              {organizations.length > 0
                ? "Add another organization"
                : "Create your organization"}
            </h2>
            <p className="mt-1 mb-5 text-sm text-zinc-600 dark:text-zinc-400">
              You will be its owner. Your existing account and any recruitment
              access you already have stay exactly as they are.
            </p>
            <OrganizationForm />
          </section>
        </div>
      </div>
    </main>
  );
}
