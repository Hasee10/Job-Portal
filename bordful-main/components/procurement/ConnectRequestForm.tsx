"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ConnectionDirection } from "@/lib/procurement/connection-actions";

// Shown on a public business profile to a signed-in visitor who manages at
// least one organization. The server decides again whether this person may
// act for the organization chosen here, and whether the capabilities fit.

export interface ConnectableOrganization {
  id: string;
  isBuyer: boolean;
  isSupplier: boolean;
  name: string;
}

export function ConnectRequestForm({
  target,
  organizations,
}: {
  organizations: ConnectableOrganization[];
  target: { id: string; isBuyer: boolean; isSupplier: boolean; name: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [fromId, setFromId] = useState(organizations[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const from = organizations.find((org) => org.id === fromId);

  // Only directions both sides can actually play are offered, so the form
  // cannot propose a relationship the server will reject.
  const directions: { label: string; value: ConnectionDirection }[] = [];
  if (from?.isBuyer && target.isSupplier) {
    directions.push({ label: `Buy from ${target.name}`, value: "we_buy" });
  }
  if (from?.isSupplier && target.isBuyer) {
    directions.push({ label: `Supply ${target.name}`, value: "we_supply" });
  }
  const [direction, setDirection] = useState<ConnectionDirection | "">("");
  const chosen =
    direction && directions.some((entry) => entry.value === direction)
      ? direction
      : (directions[0]?.value ?? "");

  const submit = async () => {
    if (!(fromId && chosen)) {
      return;
    }
    setIsSending(true);
    try {
      const response = await fetch("/api/procurement/connections", {
        body: JSON.stringify({
          direction: chosen,
          fromOrganizationId: fromId,
          message: message.trim() || null,
          toOrganizationId: target.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Something broke.");
      }
      setMessage("");
      toast({
        title: `Request sent to ${target.name}. They decide whether to accept.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Something broke.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (organizations.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Work with {target.name}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Start a conversation through your business workspace. Create or select
          a business to send a connection request.
        </p>
        <Button
          asChild
          className="mt-5 h-10 w-full bg-[#086b85] text-white hover:bg-[#07576d]"
        >
          <Link href="/procurement/organizations">Open business workspace</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
        Work with {target.name}
      </h2>

      {directions.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your business and this one do not have matching buyer and supplier
          capabilities, so there is no relationship to propose yet. You can
          change what your business does on its profile.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              aria-label="Which of your businesses"
              className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              onChange={(event) => setFromId(event.target.value)}
              value={fromId}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <select
              aria-label="What you want to do"
              className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              onChange={(event) =>
                setDirection(event.target.value as ConnectionDirection)
              }
              value={chosen}
            >
              {directions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            aria-label="Message"
            className="mt-3"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Optional: say what you do and why you are getting in touch."
            rows={3}
            value={message}
          />
          <Button
            className="mt-3"
            disabled={isSending}
            onClick={submit}
            type="button"
          >
            {isSending ? "Sending…" : "Send connection request"}
          </Button>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            They see your business name and message, and choose whether to
            accept.
          </p>
        </>
      )}
    </section>
  );
}
