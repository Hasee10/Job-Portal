import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrganizationForm } from "@/components/procurement/OrganizationForm";
import config from "@/config";
import { localBusinessPreviewHref } from "@/lib/dev/business-preview";
import {
  listOrganizationsWithAttention,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";

export const metadata: Metadata = {
  description:
    "Create and manage the businesses you represent on the procurement marketplace.",
  title: `Your organizations | ${config.title}`,
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
    const preview = await localBusinessPreviewHref();
    if (preview) redirect(preview);
    redirect("/sign-in?callbackUrl=/procurement/organizations");
  }

  const organizations = await listOrganizationsWithAttention(member);

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Your organizations
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            A business can buy, supply, or do both. You can belong to more than
            one — pick the business you want to work as.
          </p>

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
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                      href={`/procurement/organizations/${organization.id}`}
                    >
                      <span>
                        <span className="block font-semibold text-zinc-900 dark:text-zinc-50">
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
