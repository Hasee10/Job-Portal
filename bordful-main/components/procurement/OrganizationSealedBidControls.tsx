"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Mirrors the two buttons in RequestDetail.tsx (legacy employer-owned
// requests) exactly - same visibility conditions, same two actions. Only
// rendered for a sealed request; an unsealed one already reaches
// "evaluating" directly from closed_for_responses with no separate opening
// step, same as the legacy path.

export function OrganizationSealedBidControls({
  organizationId,
  requestId,
  status,
}: {
  organizationId: string;
  requestId: string;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const base = `/api/procurement/organizations/${organizationId}/requests/${requestId}`;

  const run = async (label: string, path: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${path}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${label}.`);
      }
      router.refresh();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : `Failed to ${label}.`,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {status === "closed_for_responses" && (
        <Button
          disabled={busy}
          onClick={() => run("open bids", "open-bids")}
          size="sm"
        >
          Open bids
        </Button>
      )}
      {["closed_for_responses", "bids_opened"].includes(status) && (
        <Button
          disabled={busy}
          onClick={() => run("start evaluation", "start-evaluation")}
          size="sm"
          variant="outline"
        >
          Start evaluation
        </Button>
      )}
    </div>
  );
}
