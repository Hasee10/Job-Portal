import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrganizationForm } from "@/components/procurement/OrganizationForm";
import config from "@/config";
import {
  canManageOrganization,
  getOrganizationForMember,
  listOrganizationMembers,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";

export const metadata: Metadata = {
  description: "Manage your organization's profile and capabilities.",
  title: `Organization | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    redirect(`/sign-in?callbackUrl=/procurement/organizations/${id}`);
  }

  // Membership-scoped: a non-member gets the same 404 as a non-existent
  // organization, so knowing an id reveals nothing.
  const organization = await getOrganizationForMember(member, id);
  if (!organization) {
    notFound();
  }

  const members = await listOrganizationMembers(member, id);
  const canEdit = canManageOrganization(organization.role);

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <Link
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            href="/procurement/organizations"
          >
            &larr; All organizations
          </Link>
          <h1 className="mt-3 font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            {organization.name}
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            You are {organization.role} of this organization.
            {canEdit
              ? ""
              : " Only an owner or admin can change the profile below."}
          </p>

          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
            <OrganizationForm canEdit={canEdit} organization={organization} />
          </section>

          <section className="mt-8">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
              Members
            </h2>
            <ul className="mt-3 space-y-2">
              {members.map((entry) => (
                <li
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
                  key={entry.id}
                >
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {entry.memberType} account
                    {entry.memberId === member.memberId &&
                    entry.memberType === member.memberType
                      ? " (you)"
                      : ""}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {entry.role}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
