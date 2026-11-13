import { ArrowUpRight, MapPin, Users } from "lucide-react";
import Link from "next/link";
import type { PublicOrganization } from "@/lib/procurement/directory-actions";

export function OrganizationAvatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter((word) => word.toLowerCase() !== "demo")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5 font-semibold text-[hsl(var(--primary))] dark:text-lime-200 ${large ? "h-20 w-20 text-2xl" : "h-12 w-12 text-base"}`}
    >
      {initials}
    </span>
  );
}
export function OrganizationCapabilities({
  organization,
}: {
  organization: Pick<PublicOrganization, "isBuyer" | "isSupplier">;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {organization.isBuyer && (
        <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-900 text-xs dark:bg-sky-950 dark:text-sky-200">
          Buyer
        </span>
      )}
      {organization.isSupplier && (
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-900 text-xs dark:bg-emerald-950 dark:text-emerald-200">
          Supplier
        </span>
      )}
    </div>
  );
}
export function OrganizationCard({
  organization,
}: {
  organization: PublicOrganization;
}) {
  const summary = organization.productsServices || organization.description;
  return (
    <Link
      className="group flex h-full flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      href={`/procurement/directory/${organization.id}`}
    >
      <div className="flex items-start gap-4">
        <OrganizationAvatar name={organization.name} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 min-h-12 break-words font-semibold text-base leading-6">
            {organization.name}
          </h3>
          <p className="mt-1 text-muted-foreground text-xs">
            {organization.industry || "Business profile"}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <OrganizationCapabilities organization={organization} />
      </div>
      <p className="mt-4 line-clamp-2 min-h-10 text-muted-foreground text-sm leading-5">
        {summary ||
          "Explore this business profile to learn more about its capabilities."}
      </p>
      <div className="mt-5 space-y-2 pb-5 text-muted-foreground text-xs">
        {organization.location && (
          <p className="flex items-start gap-2">
            <MapPin size={14} className="shrink-0" aria-hidden="true" />
            {organization.location}
          </p>
        )}
        {organization.companySize && (
          <p className="flex items-center gap-2">
            <Users size={14} aria-hidden="true" />
            {organization.companySize} employees
          </p>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between border-t pt-4 text-sm">
        <span className="mt-4 font-medium text-[hsl(var(--primary))] dark:text-lime-200">
          View business profile
        </span>
        <ArrowUpRight
          size={17}
          className="mt-4 text-muted-foreground group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
