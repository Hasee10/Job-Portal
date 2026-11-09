"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Mirrors the three buttons in RequestDetail.tsx (legacy employer-owned
// requests) exactly - same visibility conditions, same actions: "Open bids"
// is sealed-only, "Close for responses" and "Start evaluation" are not.
// Previously rendered only when request.sealedBids was true, which meant an
// unsealed organization RFQ (the default - the creation form has no sealed
// toggle) had no path off "published" at all, since close-for-responses is
// what start-evaluation's own gate (closed_for_responses/bids_opened)
// depends on.

export function OrganizationSealedBidControls({
  organizationId,
  requestId,
  status,
  sealedBids,
}: {
  organizationId: string;
  requestId: string;
  status: string;
  sealedBids: boolean;
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
      {status === "published" && (
        <Button
          disabled={busy}
          onClick={() => run("close for responses", "close-for-responses")}
          size="sm"
          variant="outline"
        >
          Close for responses
        </Button>
      )}
      {status === "closed_for_responses" && sealedBids && (
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
