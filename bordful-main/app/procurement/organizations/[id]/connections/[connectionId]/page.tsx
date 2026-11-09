import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ConversationPanel } from "@/components/procurement/ConversationPanel";
import config from "@/config";
import { listConnections } from "@/lib/procurement/connection-actions";
import { listMessages } from "@/lib/procurement/message-actions";
import {
  getOrganizationForMember,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";

export const metadata: Metadata = {
  description: "Messages with a connected business.",
  title: `Conversation | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ connectionId: string; id: string }>;
}) {
  const { connectionId, id } = await params;
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    redirect(
      `/sign-in?callbackUrl=/procurement/organizations/${id}/connections/${connectionId}`
    );
  }

  // Membership-scoped, exactly as the organization page is: a non-member gets
  // the same 404 as a non-existent organization.
  const organization = await getOrganizationForMember(member, id);
  if (!organization) {
    notFound();
  }

  // Reuses the M3A listing rather than re-querying connections here, which
  // also gives the counterpart's name and the relationship's status in one
  // place.
  const connections = await listConnections(member, id);
  const accepted = connections.accepted.find((c) => c.id === connectionId);

  if (!accepted) {
    const pendingOrRejected = [
      ...connections.incoming,
      ...connections.outgoing,
      ...connections.rejected,
    ].find((c) => c.id === connectionId);

    // A connection that exists but has not been accepted gets an explanation
    // rather than a 404, because the viewer legitimately knows about it.
    // Anything else is simply not theirs.
    if (!pendingOrRejected) {
      notFound();
    }

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
            <h1 className="mt-3 font-bold text-2xl text-zinc-900 dark:text-zinc-50">
              Messaging is not open yet
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {pendingOrRejected.status === "pending"
                ? "This connection request is still awaiting a decision. Once it is accepted, both businesses can message each other here."
                : "This connection request was declined, so the two businesses cannot message each other."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const initialPage = await listMessages(member, id, connectionId);
  const counterpartyName = accepted.counterpart?.name ?? "this business";

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
          <h1 className="mt-3 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-50">
            {counterpartyName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {accepted.isBuyer
              ? `You buy from ${counterpartyName}.`
              : `You supply ${counterpartyName}.`}{" "}
            Messages are visible to members of both businesses.
          </p>

          <ConversationPanel
            connectionId={connectionId}
            counterpartyName={counterpartyName}
            initialPage={initialPage}
            organizationId={id}
          />
        </div>
      </div>
    </main>
  );
}
