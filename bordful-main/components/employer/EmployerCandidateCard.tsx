"use client";

import { CheckCircle, Clock, Send, UserCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { JobCandidate } from "@/lib/jobs/employer-candidate-actions";
import { EmployerInviteModal } from "./EmployerInviteModal";

const STATUS_BADGE: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  accepted: {
    className:
      "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    icon: <CheckCircle className="h-3 w-3" />,
    label: "Accepted",
  },
  declined: {
    className: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    icon: <XCircle className="h-3 w-3" />,
    label: "Declined",
  },
  pending: {
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    icon: <Clock className="h-3 w-3" />,
    label: "Invited",
  },
  read: {
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    icon: <UserCheck className="h-3 w-3" />,
    label: "Viewed",
  },
};

export function EmployerCandidateCard({
  candidate,
  jobId,
  jobTitle,
  dailyRemaining,
  onInviteSent,
}: {
  candidate: JobCandidate;
  jobId: string;
  jobTitle: string;
  dailyRemaining: number;
  onInviteSent: (seekerId: string, remaining: number) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const displayName = candidate.name || "Anonymous";
  const initials = displayName.charAt(0).toUpperCase();
  const statusInfo = candidate.inviteStatus
    ? STATUS_BADGE[candidate.inviteStatus]
    : null;

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                {displayName}
              </h3>
              {statusInfo && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs ${statusInfo.className}`}
                >
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              )}
            </div>
            {candidate.headline && (
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {candidate.headline}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
              {candidate.matchScore}%
            </p>
            <p className="text-[10px] text-zinc-400">match</p>
          </div>
        </div>

        {candidate.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, 8).map((skill) => (
              <span
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                key={skill}
              >
                {skill}
              </span>
            ))}
            {candidate.skills.length > 8 && (
              <span className="self-center text-xs text-zinc-400">
                +{candidate.skills.length - 8} more
              </span>
            )}
          </div>
        )}

        <div className="mt-4 border-zinc-100 border-t pt-3 dark:border-zinc-800">
          {candidate.inviteStatus === "accepted" ? (
            <p className="font-medium text-green-700 text-xs dark:text-green-400">
              Contact: {candidate.email}
            </p>
          ) : candidate.inviteStatus ? (
            <p className="text-xs text-zinc-400">Invite already sent</p>
          ) : (
            <Button
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowModal(true)}
              size="sm"
              variant="outline"
            >
              <Send className="h-3 w-3" />
              Invite to apply
            </Button>
          )}
        </div>
      </div>

      {showModal && (
        <EmployerInviteModal
          candidate={candidate}
          dailyRemaining={dailyRemaining}
          jobId={jobId}
          jobTitle={jobTitle}
          onClose={() => setShowModal(false)}
          onSent={onInviteSent}
        />
      )}
    </>
  );
}
