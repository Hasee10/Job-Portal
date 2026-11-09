"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Joining an organization with the code a colleague passed on. Membership is
// granted to the account that is signed in here, which is why this page is
// behind sign-in: the code says which organization and which role, and the
// session says who.

export function RedeemInvitationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  const submit = async (decline: boolean) => {
    const code = token.trim();
    if (!code) {
      toast({ title: "Paste your invitation code.", variant: "destructive" });
      return;
    }
    setBusy(decline ? "decline" : "accept");
    try {
      const response = await fetch("/api/procurement/invitations/redeem", {
        body: JSON.stringify({ decline, token: code }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        organizationId?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Something broke.");
      }
      if (decline) {
        setToken("");
        toast({ title: "Invitation declined." });
        router.refresh();
        return;
      }
      toast({ title: "You have joined the organization." });
      router.push(`/procurement/organizations/${payload.organizationId}`);
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
    <div className="mt-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <Input
        aria-label="Invitation code"
        autoComplete="off"
        className="font-mono"
        onChange={(event) => setToken(event.target.value)}
        placeholder="Paste the code your colleague sent you"
        value={token}
      />
      <div className="mt-3 flex gap-2">
        <Button
          disabled={busy !== null}
          onClick={() => submit(false)}
          type="button"
        >
          {busy === "accept" ? "Joining…" : "Join organization"}
        </Button>
        <Button
          disabled={busy !== null}
          onClick={() => submit(true)}
          type="button"
          variant="outline"
        >
          {busy === "decline" ? "Declining…" : "Decline"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        A code can be used once and expires seven days after it is created.
        If it does not work, ask whoever invited you for a new one.
      </p>
    </div>
  );
}
