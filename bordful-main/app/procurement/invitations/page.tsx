import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RedeemInvitationForm } from "@/components/procurement/RedeemInvitationForm";
import config from "@/config";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";

export const metadata: Metadata = {
  description: "Join an organization you have been invited to.",
  title: `Join an organization | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function RedeemInvitationPage() {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  // Signing in first is the point: the invitation decides which
  // organization and role, and the session decides who is joining.
  if (!member) {
    redirect("/sign-in?callbackUrl=/procurement/invitations");
  }

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Join an organization
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Someone at the business invited you and gave you a code. Paste it
            below to join with the account you are signed in as.
          </p>
          <RedeemInvitationForm />
        </div>
      </div>
    </main>
  );
}
