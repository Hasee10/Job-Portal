"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ProcurementEvaluation } from "@/lib/procurement/evaluation-actions";

// The organization equivalent of ResponseCard's evaluate/award controls in
// RequestDetail.tsx - same two actions (score+notes, award), scoped to one
// response row. Kept separate from OrganizationResponsesPanel (a server
// component) because these buttons need client-side state; the panel still
// owns the read-only response content.

export function OrganizationEvaluationControls({
  organizationId,
  requestId,
  responseId,
  isWithdrawn,
  canEvaluate,
  canAward,
  scores,
}: {
  organizationId: string;
  requestId: string;
  responseId: string;
  isWithdrawn: boolean;
  canEvaluate: boolean;
  canAward: boolean;
  scores: ProcurementEvaluation[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  const base = `/api/procurement/organizations/${organizationId}/requests/${requestId}`;

  const run = async (label: string, path: string, body: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${path}`, {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
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
    <div className="mt-3 space-y-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
      {scores.length > 0 && (
        <div className="space-y-1">
          {scores.map((s) => (
            <p className="text-muted-foreground text-xs" key={s.id}>
              Score: {s.score ?? "—"} {s.notes ? `— ${s.notes}` : ""}
            </p>
          ))}
        </div>
      )}
      {canAward && !isWithdrawn && (
        <Button
          disabled={busy}
          onClick={() => run("award", "award", { responseId })}
          size="sm"
        >
          Award
        </Button>
      )}
      {canEvaluate && !isWithdrawn && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="sm:w-24"
            onChange={(e) => setScore(e.target.value)}
            placeholder="Score"
            type="number"
            value={score}
          />
          <Textarea
            className="flex-1"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={1}
            value={notes}
          />
          <Button
            disabled={busy}
            onClick={() => {
              run("evaluations", "evaluations", {
                notes: notes.trim() || null,
                responseId,
                score: score ? Number(score) : null,
              });
              setScore("");
              setNotes("");
            }}
            size="sm"
            variant="outline"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
