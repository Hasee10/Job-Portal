"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { JobCandidate } from "@/lib/jobs/employer-candidate-actions";

export function EmployerInviteModal({
  candidate,
  jobId,
  jobTitle,
  dailyRemaining,
  onClose,
  onSent,
}: {
  candidate: JobCandidate;
  jobId: string;
  jobTitle: string;
  dailyRemaining: number;
  onClose: () => void;
  onSent: (seekerId: string, remaining: number) => void;
}) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const displayName = candidate.name || candidate.email.split("@")[0];
  const atLimit = dailyRemaining <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || atLimit) {
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/employer/invite", {
        body: JSON.stringify({
          jobId,
          jobTitle,
          message: message.trim(),
          seekerEmail: candidate.email,
          seekerId: candidate.seekerId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.limitReached) {
          toast({
            description: result.error,
            title: "Daily limit reached",
            variant: "destructive",
          });
          onClose();
          return;
        }
        throw new Error(result.error || "Failed to send.");
      }

      toast({
        description: `${displayName} will be notified by email.`,
        title: "Invite sent",
      });
      onSent(
        candidate.seekerId,
        typeof result.remaining === "number"
          ? result.remaining
          : dailyRemaining - 1
      );
      onClose();
    } catch (error) {
      toast({
        description:
          error instanceof Error ? error.message : "Please try again.",
        title: "Failed to send",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
          Invite {displayName} to apply
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {jobTitle}
        </p>

        {atLimit ? (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-900 text-sm dark:text-amber-200">
                Daily limit reached
              </p>
              <p className="mt-0.5 text-amber-700 text-xs dark:text-amber-300">
                You&rsquo;ve sent 20 invites today. Your limit resets in 24
                hours.
              </p>
            </div>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label
                className="font-medium text-sm text-zinc-700 dark:text-zinc-300"
                htmlFor="invite-msg"
              >
                Your message
              </label>
              <Textarea
                id="invite-msg"
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hi ${displayName}, we think you'd be a great fit for ${jobTitle}…`}
                rows={5}
                value={message}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">{message.length}/2000</p>
                <p className="text-xs text-zinc-400">
                  {dailyRemaining} invite{dailyRemaining === 1 ? "" : "s"}{" "}
                  remaining today
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={isSubmitting || !message.trim()}
                type="submit"
              >
                {isSubmitting ? "Sending…" : "Send invite"}
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {atLimit && (
          <Button className="mt-4 w-full" onClick={onClose} variant="outline">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
