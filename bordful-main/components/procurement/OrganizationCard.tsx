import { Building2 } from "lucide-react";
import Link from "next/link";
import type { PublicOrganization } from "@/lib/procurement/directory-actions";

function capabilityLabels(organization: PublicOrganization): string[] {
  const labels: string[] = [];
  if (organization.isBuyer) {
    labels.push("Buyer");
  }
  if (organization.isSupplier) {
    labels.push("Supplier");
  }
  return labels;
}

export function OrganizationCard({
  organization,
}: {
  organization: PublicOrganization;
}) {
  const summary = organization.productsServices || organization.description;

  return (
    <Link
      className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
      href={`/procurement/directory/${organization.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {organization.name}
        </h3>
        <Building2
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-zinc-400"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {capabilityLabels(organization).map((label) => (
          <span
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>

      {summary ? (
        <p className="mt-3 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
          {summary}
        </p>
      ) : null}

      <dl className="mt-auto pt-4 text-xs text-zinc-500 dark:text-zinc-400">
        {organization.industry ? <dd>{organization.industry}</dd> : null}
        {organization.operatingRegions.length > 0 ? (
          <dd className="mt-0.5">
            {organization.operatingRegions.slice(0, 3).join(", ")}
          </dd>
        ) : null}
      </dl>
    </Link>
  );
}
