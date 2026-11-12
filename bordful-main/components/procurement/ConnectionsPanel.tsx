"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type {
  ConnectionLists,
  OrganizationConnection,
  OrganizationSummary,
} from "@/lib/procurement/connection-actions";

// Incoming, outgoing and established relationships for one organization,
// plus the buyer's approved supplier list. Accept and reject are the only
// writes; everything is re-authorized on the server.

function Counterpart({
  connection,
}: {
  connection: OrganizationConnection;
}) {
  const name = connection.counterpart?.name ?? "A business";
  const role = connection.isBuyer ? "as your supplier" : "as their supplier";
  return (
    <span className="text-zinc-700 dark:text-zinc-300">
      {connection.counterpart ? (
        <Link
          className="font-medium underline-offset-2 hover:underline"
          href={`/procurement/directory/${connection.counterpart.id}`}
        >
          {name}
        </Link>
      ) : (
        <span className="font-medium">{name}</span>
      )}{" "}
      <span className="text-zinc-500 dark:text-zinc-400">{role}</span>
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{children}</p>
  );
}

export function ConnectionsPanel({
  connections,
  approvedSuppliers,
  canManage,
  organizationId,
}: {
  approvedSuppliers: OrganizationSummary[];
  canManage: boolean;
  connections: ConnectionLists;
  organizationId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const respond = async (
    connectionId: string,
    decision: "accepted" | "rejected"
  ) => {
    setBusy(`${connectionId}-${decision}`);
    try {
      const response = await fetch(
        `/api/procurement/connections/${connectionId}`,
        {
          body: JSON.stringify({ decision }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Something broke.");
      }
      toast({
        title:
          decision === "accepted"
            ? "Connection accepted."
            : "Request rejected.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Something broke.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-8">
      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
        Business connections
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Relationships with other businesses on the marketplace.
      </p>

      <h3 className="mt-5 font-medium text-sm text-zinc-900 dark:text-zinc-50">
        Requests to you
      </h3>
      {connections.incoming.length === 0 ? (
        <Empty>Nothing is waiting for your answer.</Empty>
      ) : (
        <ul className="mt-2 space-y-2">
          {connections.incoming.map((connection) => (
            <li
              className="rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              key={connection.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Counterpart connection={connection} />
                {canManage ? (
                  <span className="flex gap-2">
                    <Button
                      disabled={busy !== null}
                      onClick={() => respond(connection.id, "accepted")}
                      size="sm"
                      type="button"
                    >
                      {busy === `${connection.id}-accepted`
                        ? "Accepting…"
                        : "Accept"}
                    </Button>
                    <Button
                      disabled={busy !== null}
                      onClick={() => respond(connection.id, "rejected")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {busy === `${connection.id}-rejected`
                        ? "Rejecting…"
                        : "Reject"}
                    </Button>
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    An owner or admin can answer this.
                  </span>
                )}
              </div>
              {connection.message ? (
                <p className="mt-2 whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                  {connection.message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 font-medium text-sm text-zinc-900 dark:text-zinc-50">
        Requests you sent
      </h3>
      {connections.outgoing.length === 0 ? (
        <Empty>
          You have not asked anyone to connect. Find businesses in the{" "}
          <Link
            className="underline underline-offset-2"
            href="/procurement/directory"
          >
            directory
          </Link>
          .
        </Empty>
      ) : (
        <ul className="mt-2 space-y-2">
          {connections.outgoing.map((connection) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              key={connection.id}
            >
              <Counterpart connection={connection} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Waiting for their answer
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 font-medium text-sm text-zinc-900 dark:text-zinc-50">
        Connected
      </h3>
      {connections.accepted.length === 0 ? (
        <Empty>No established relationships yet.</Empty>
      ) : (
        <ul className="mt-2 space-y-2">
          {connections.accepted.map((connection) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              key={connection.id}
            >
              <Counterpart connection={connection} />
              <span className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {connection.isBuyer ? "You buy" : "You supply"}
                </span>
                {/* Only rendered for accepted connections - a pending or
                    rejected request offers no messaging action at all. */}
                <Link
                  className="font-medium text-primary text-xs hover:underline"
                  href={`/procurement/organizations/${organizationId}/connections/${connection.id}`}
                >
                  Messages
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}

      {approvedSuppliers.length > 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
            Your approved suppliers
          </h3>
          <ul className="mt-2 space-y-2">
            {approvedSuppliers.map((supplier) => (
              <li className="text-sm" key={supplier.id}>
                <Link
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
                  href={`/procurement/directory/${supplier.id}`}
                >
                  {supplier.name}
                </Link>
                {supplier.industry ? (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {" "}
                    · {supplier.industry}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {/* Said plainly, because "approved" invites the other reading. */}
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Approved by you, for your own purchasing. Caliber has not verified
            these businesses, their certificates or their finances.
          </p>
        </div>
      ) : null}
    </section>
  );
}
