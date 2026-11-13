import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { BusinessWorkspaceDashboard } from "@/components/procurement/BusinessWorkspaceDashboard";
import { OrganizationForm } from "@/components/procurement/OrganizationForm";
import config from "@/config";
import {
  localPresentationEntry,
  isLocalPresentationRequest,
} from "@/lib/auth/local-presentation";
import {
  listOrganizationsWithAttention,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";

export const metadata: Metadata = {
  description:
    "Your sourcing activity, partnerships and team in one organized workspace.",
  title: `Procurement dashboard | ${config.title}`,
};
export const dynamic = "force-dynamic";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; view?: string }>;
}) {
  const params = await searchParams;
  const host = (await headers()).get("host") ?? "";
  const requestUrl = `http://${host}`;
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    const callback = `/procurement/organizations?${new URLSearchParams({ ...(params.workspace ? { workspace: params.workspace } : {}), ...(params.view ? { view: params.view } : {}) })}`;
    const demoEntry = localPresentationEntry(requestUrl, callback);
    if (demoEntry) redirect(demoEntry);
    redirect(`/sign-in?${new URLSearchParams({ callbackUrl: callback })}`);
  }
  const organizations = await listOrganizationsWithAttention(member);
  if (organizations.length > 0 && params.view !== "Create") {
    return (
      <BusinessWorkspaceDashboard
        member={member}
        organizations={organizations}
        workspace={params.workspace}
        view={params.view}
        isPresentation={isLocalPresentationRequest(requestUrl)}
      />
    );
  }
  return (
    <main className="min-h-[60vh] bg-background px-4 py-16">
      <section className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 sm:p-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          BUSINESS WORKSPACE
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {organizations.length > 0
            ? "Add another business"
            : "Create your organization"}
        </h1>
        <p className="mb-6 mt-3 text-sm text-muted-foreground">
          A business can buy, supply, or do both. Create your business to start
          managing procurement, partnerships and your team.
        </p>
        <OrganizationForm />
        {organizations.length > 0 && (
          <Link
            className="mt-6 inline-block text-sm text-primary underline"
            href="/procurement/organizations"
          >
            Back to your workspace
          </Link>
        )}
      </section>
    </main>
  );
}
