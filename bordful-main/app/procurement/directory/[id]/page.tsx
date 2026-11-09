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
      <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
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

  const capabilities = [
    organization.isBuyer ? "Buyer" : null,
    organization.isSupplier ? "Supplier" : null,
  ].filter((label): label is string => label !== null);

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
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <Link
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            href="/procurement/directory"
          >
            &larr; Business directory
          </Link>

          <h1 className="mt-3 font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            {organization.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {capabilities.map((label) => (
              <span
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                key={label}
              >
                {label}
              </span>
            ))}
          </div>

          {organization.description ? (
            <p className="mt-5 text-zinc-700 dark:text-zinc-300">
              {organization.description}
            </p>
          ) : null}

          {organization.productsServices ? (
            <section className="mt-8">
              <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                Products and services
              </h2>
              <p className="mt-2 whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                {organization.productsServices}
              </p>
            </section>
          ) : null}

          <section className="mt-8 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <dl className="grid gap-4 sm:grid-cols-2">
              {details.map((detail) => (
                <Detail
                  key={detail.label}
                  label={detail.label}
                  value={detail.value}
                />
              ))}
            </dl>
          </section>

          <ConnectRequestForm
            organizations={connectableOrganizations}
            target={{
              id: organization.id,
              isBuyer: organization.isBuyer,
              isSupplier: organization.isSupplier,
              name: organization.name,
            }}
          />

          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            This information is self-declared by the business and has not been
            verified.
          </p>
        </div>
      </div>
    </main>
  );
}
