"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { InviteWithJob } from "@/lib/jobs/employer-candidate-actions";
import { generateJobSlug } from "@/lib/utils/slugify";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function EmployerInviteItem({
  invite: initial,
}: {
  invite: InviteWithJob;
}) {
  const [invite, setInvite] = useState(initial);
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();

  const respond = async (action: "accept" | "decline") => {
    setIsResponding(true);
    try {
      const res = await fetch(`/api/seeker/invites/${invite.id}`, {
        body: JSON.stringify({ action }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error();
      }
      const data = await res.json();
      setInvite((prev) => ({ ...prev, status: data.invite.status }));
      toast({
        title: action === "accept" ? "Invite accepted" : "Invite declined",
      });
    } catch {
      toast({
        description: "Please try again.",
        title: "Action failed",
        variant: "destructive",
      });
    } finally {
      setIsResponding(false);
    }
  };

  const statusColors: Record<string, string> = {
    accepted: "border-l-green-500",
    declined: "border-l-zinc-300 dark:border-l-zinc-600",
    pending: "border-l-amber-400",
    read: "border-l-blue-400",
  };

  const jobHref = `/jobs/${generateJobSlug(invite.jobTitle, invite.companyName ?? "")}`;

  return (
    <div
      className={`rounded-xl border border-zinc-200 border-l-4 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60 ${statusColors[invite.status] ?? ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">Invited to apply for</p>
          <Link
            className="font-semibold text-sm text-zinc-900 hover:underline dark:text-zinc-50"
            href={jobHref}
          >
            {invite.jobTitle}
          </Link>
          {invite.companyName && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {invite.companyName}
            </p>
          )}
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatDate(invite.createdAt)}
          </p>
        </div>
        {invite.status === "accepted" && (
          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-0.5 font-medium text-green-700 text-xs dark:bg-green-500/10 dark:text-green-400">
            Accepted
          </span>
        )}
        {invite.status === "declined" && (
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-xs text-zinc-500 dark:bg-zinc-800">
            Declined
          </span>
        )}
      </div>

      <p className="mt-3 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
        {invite.message}
      </p>

      {(invite.status === "pending" || invite.status === "read") && (
        <div className="mt-4 flex gap-2">
          <Button
            className="h-8 gap-1.5 text-xs"
            disabled={isResponding}
            onClick={() => respond("accept")}
            size="sm"
          >
            <Check className="h-3 w-3" />
            Accept
          </Button>
          <Button
            className="h-8 gap-1.5 text-xs"
            disabled={isResponding}
            onClick={() => respond("decline")}
            size="sm"
            variant="outline"
          >
            <X className="h-3 w-3" />
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
