"use client";

import { Check, Clock, Star, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type {
  ApplicationStatus,
  ApplicationWithSeeker,
} from "@/lib/jobs/application-actions";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  hired:
    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  new: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  rejected: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  reviewed: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  shortlisted:
    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
};

export function ApplicationCard({
  application: initial,
  apiBasePath = "/api/employer/applications",
}: {
  application: ApplicationWithSeeker;
  apiBasePath?: string;
}) {
  const [application, setApplication] = useState(initial);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const displayName =
    application.seekerName || application.seekerEmail.split("@")[0];

  const setStatus = async (status: ApplicationStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${apiBasePath}/${application.id}`, {
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error();
      }
      setApplication((prev) => ({ ...prev, status }));
      toast({ title: `Marked as ${status}` });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
              {displayName}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_STYLES[application.status]}`}
            >
              {application.status}
            </span>
            {application.autoShortlisted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-500/10 dark:text-amber-400">
                <Star className="h-3 w-3" />
                Auto-shortlisted
              </span>
            )}
          </div>
          {application.resumeSnapshot.headline && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {application.resumeSnapshot.headline}
            </p>
          )}
          <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="h-3 w-3" />
            Applied{" "}
            {new Date(application.createdAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
            {application.matchScore}%
          </p>
          <p className="text-xs text-zinc-400">match</p>
        </div>
      </div>

      {application.resumeSnapshot.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {application.resumeSnapshot.skills.slice(0, 10).map((skill) => (
            <span
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              key={skill}
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {application.coverLetter && (
        <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
          {application.coverLetter}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-zinc-100 border-t pt-3 dark:border-zinc-800">
        <a
          className="text-primary text-xs hover:underline"
          href={`mailto:${application.seekerEmail}`}
        >
          {application.seekerEmail}
        </a>
        <div className="flex gap-2">
          {application.status !== "shortlisted" &&
            application.status !== "hired" && (
              <Button
                className="h-7 gap-1 text-xs"
                disabled={isUpdating}
                onClick={() => setStatus("shortlisted")}
                size="sm"
                variant="outline"
              >
                <Check className="h-3 w-3" />
                Shortlist
              </Button>
            )}
          {application.status !== "rejected" && (
            <Button
              className="h-7 gap-1 text-xs"
              disabled={isUpdating}
              onClick={() => setStatus("rejected")}
              size="sm"
              variant="outline"
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
