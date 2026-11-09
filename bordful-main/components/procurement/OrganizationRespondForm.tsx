"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationResponse } from "@/lib/procurement/organization-response-actions";

// Supplier-side: review the invitation, submit a quotation, see its status.
// Revision is not supported - withdraw-then-resubmit is the only existing
// semantics (see withdrawOrganizationResponse), so this form does not invent
// an edit flow.

export function OrganizationRespondForm({
  awardOutcome,
  blockedReason,
  canSubmitNew,
  canWithdraw,
  existingResponse,
  organizationId,
  requestId,
}: {
  awardOutcome: "won" | "lost" | null;
  blockedReason: string | null;
  canSubmitNew: boolean;
  canWithdraw: boolean;
  existingResponse: OrganizationResponse | null;
  organizationId: string;
  requestId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposalText, setProposalText] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");

  const endpoint = `/api/procurement/organizations/${organizationId}/opportunities/${requestId}/response`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalText.trim()) {
      toast({ title: "A proposal is required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        body: JSON.stringify({
          pricing: price.trim() ? { amount: price.trim(), currency } : null,
          proposalText,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit your response.");
      }
      toast({ title: "Quotation submitted." });
      router.refresh();
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Failed to submit your response.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to withdraw your response.");
      }
      toast({ title: "Response withdrawn." });
      router.refresh();
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Failed to withdraw your response.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (existingResponse && !existingResponse.isWithdrawn) {
    const amount = existingResponse.pricing?.amount as string | undefined;
    const currencyCode = existingResponse.pricing?.currency as
      | string
      | undefined;
    return (
      <section className="mt-8 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
          Your submission
        </h2>
        {awardOutcome === "won" ? (
          <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 font-medium text-emerald-800 text-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            You won this request.
          </p>
        ) : null}
        {awardOutcome === "lost" ? (
          <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            This request was awarded to another business.
          </p>
        ) : null}
        <p className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
          {existingResponse.proposalText}
        </p>
        {amount ? (
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {currencyCode} {amount}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-zinc-500">
          Submitted {new Date(existingResponse.submittedAt).toLocaleString()}
        </p>
        {canWithdraw ? (
          <Button
            className="mt-4"
            disabled={isSubmitting}
            onClick={handleWithdraw}
            type="button"
            variant="outline"
          >
            {isSubmitting ? "Withdrawing" : "Withdraw"}
          </Button>
        ) : (
          <p className="mt-4 text-xs text-zinc-500">
            {blockedReason ?? "This request is no longer accepting changes."}
          </p>
        )}
      </section>
    );
  }

  if (!canSubmitNew) {
    return (
      <section className="mt-8 rounded-xl border border-zinc-200 border-dashed p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        {blockedReason ?? "You cannot respond to this request."}
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
        Submit a quotation
      </h2>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="font-medium text-sm" htmlFor="response-text">
            Proposal
          </label>
          <Textarea
            id="response-text"
            onChange={(e) => setProposalText(e.target.value)}
            placeholder="How you'll meet this request, lead time, and any conditions."
            required
            rows={4}
            value={proposalText}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1.5">
            <label className="font-medium text-sm" htmlFor="response-price">
              Price
            </label>
            <Input
              id="response-price"
              onChange={(e) => setPrice(e.target.value)}
              placeholder="4500"
              value={price}
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-medium text-sm" htmlFor="response-currency">
              Currency
            </label>
            <Input
              className="w-20"
              id="response-currency"
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              value={currency}
            />
          </div>
        </div>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting" : "Submit quotation"}
        </Button>
      </form>
    </section>
  );
}
