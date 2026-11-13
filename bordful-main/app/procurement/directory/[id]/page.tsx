import { ArrowLeft, MapPin, Users, Info } from "lucide-react";
import {
  OrganizationAvatar,
  OrganizationCapabilities,
} from "@/components/procurement/OrganizationCard";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ConnectRequestForm } from "@/components/procurement/ConnectRequestForm";
import config from "@/config";
import { getPublicOrganization } from "@/lib/procurement/directory-actions";
import {
  canManageOrganization,
  listOrganizationsForMember,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const organization = await getPublicOrganization(id);
  if (!organization) {
    return { title: `Business | ${config.title}` };
  }
  return {
    description:
      organization.productsServices ||
      organization.description ||
      `${organization.name} on the ${config.title} marketplace.`,
    title: `${organization.name} | ${config.title}`,
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

export default async function PublicOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // is_public is part of the query, so an unlisted organization is a 404
  // here for everyone, including its own members.
  const organization = await getPublicOrganization(id);
  if (!organization) {
    notFound();
  }

  // The businesses this visitor could connect *as*. Only ones they manage,
  // and never this one - a business cannot connect to itself. An anonymous
  // visitor gets an empty list and is invited to create a business instead.
  const session = await auth();
  const viewer = resolveOrganizationMember(session);
  const connectableOrganizations = viewer
    ? (await listOrganizationsForMember(viewer))
        .filter(
          (entry) =>
            entry.id !== organization.id && canManageOrganization(entry.role)
        )
        .map((entry) => ({
          id: entry.id,
          isBuyer: entry.isBuyer,
          isSupplier: entry.isSupplier,
          name: entry.name,
        }))
    : [];

  // Built as data so the markup stays one map instead of seven conditionals,
  // each of which also has to avoid rendering an empty string.
  const details = [
    { label: "Industry", value: organization.industry },
    { label: "Company size", value: organization.companySize },
    { label: "Location", value: organization.location },
    {
      label: "Operating regions",
      value: organization.operatingRegions.join(", "),
    },
    { label: "Categories", value: organization.categories.join(", ") },
    { label: "Website", value: organization.website },
    { label: "Contact", value: organization.publicContactEmail },
  ].filter((detail): detail is { label: string; value: string } =>
    Boolean(detail.value)
  );

  return (
    <main className="min-h-[60vh] bg-muted/20 pb-16">
      <section className="border-b bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <Link
            className="inline-flex items-center gap-2 text-muted-foreground text-sm hover:underline"
            href="/procurement/directory"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Business directory
          </Link>
          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-start">
            <OrganizationAvatar name={organization.name} large />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
                PUBLIC BUSINESS PROFILE
              </p>
              <h1 className="mt-2 break-words font-semibold text-3xl tracking-tight sm:text-4xl">
                {organization.name}
              </h1>
              <div className="mt-4">
                <OrganizationCapabilities organization={organization} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground text-sm">
                {organization.location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={15} aria-hidden="true" />
                    {organization.location}
                  </span>
                )}
                {organization.companySize && (
                  <span className="inline-flex items-center gap-2">
                    <Users size={15} aria-hidden="true" />
                    {organization.companySize} employees
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="container mx-auto mt-8 grid max-w-6xl items-start gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-card p-6 sm:p-8">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
              THE BUSINESS
            </p>
            <h2 className="mt-2 font-semibold text-xl">Overview</h2>
            <p className="mt-4 whitespace-pre-line text-muted-foreground text-sm leading-7">
              {organization.description ||
                "This business has not added an overview yet."}
            </p>
          </section>
          <section className="rounded-2xl border bg-card p-6 sm:p-8">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
              CAPABILITIES
            </p>
            <h2 className="mt-2 font-semibold text-xl">
              Products and services
            </h2>
            <p className="mt-4 whitespace-pre-line text-muted-foreground text-sm leading-7">
              {organization.productsServices ||
                "Contact the business to discuss its products and services."}
            </p>
            {organization.categories.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {organization.categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-lg border bg-muted/40 px-3 py-1.5 text-xs"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
          </section>
          <div className="flex items-start gap-3 rounded-xl border bg-background p-4">
            <Info
              size={17}
              className="mt-0.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Profile information is provided by the business and has not been
              independently verified. Discuss requirements and check relevant
              credentials before working together.
            </p>
          </div>
        </div>
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-6">
          <div className="[&>section]:mt-0 [&>section]:rounded-2xl [&>section]:bg-card [&>section]:p-6">
            <ConnectRequestForm
              organizations={connectableOrganizations}
              target={{
                id: organization.id,
                isBuyer: organization.isBuyer,
                isSupplier: organization.isSupplier,
                name: organization.name,
              }}
            />
          </div>
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold text-lg">Business at a glance</h2>
            <dl className="mt-5 space-y-4 divide-y [&>div+div]:pt-4">
              {details.map((detail) => (
                <Detail
                  key={detail.label}
                  label={detail.label}
                  value={detail.value}
                />
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
