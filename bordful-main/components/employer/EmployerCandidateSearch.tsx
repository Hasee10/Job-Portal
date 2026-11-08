"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { JobCandidate } from "@/lib/jobs/employer-candidate-actions";
import { EmployerCandidateCard } from "./EmployerCandidateCard";

export function EmployerCandidateSearch({
  jobId,
  jobTitle,
  initial,
  initialDailyRemaining,
}: {
  jobId: string;
  jobTitle: string;
  initial: JobCandidate[];
  initialDailyRemaining: number;
}) {
  const [candidates, setCandidates] = useState<JobCandidate[]>(initial);
  const [dailyRemaining, setDailyRemaining] = useState(initialDailyRemaining);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchCandidates = useCallback(
    async (q: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) {
          params.set("q", q);
        }
        const res = await fetch(
          `/api/employer/jobs/${jobId}/candidates?${params}`
        );
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        setCandidates(data.candidates);
      } finally {
        setIsLoading(false);
      }
    },
    [jobId]
  );

  useEffect(() => {
    if (debouncedQuery === "") {
      setCandidates(initial);
    } else {
      fetchCandidates(debouncedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const handleInviteSent = (seekerId: string, remaining: number) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.seekerId === seekerId ? { ...c, inviteStatus: "pending" } : c
      )
    );
    setDailyRemaining(remaining);
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          className="pr-9 pl-9"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, headline, or skill…"
          type="text"
          value={query}
        />
        {query && (
          <button
            className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            onClick={() => setQuery("")}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Searching…</p>
      ) : candidates.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 border-dashed p-10 text-center dark:border-zinc-800">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            No candidates found
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {query
              ? "Try a different search term."
              : "No candidates have opted in to outreach yet."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {candidates.length} candidate{candidates.length === 1 ? "" : "s"}{" "}
            ranked by match to this job
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {candidates.map((c) => (
              <EmployerCandidateCard
                candidate={c}
                dailyRemaining={dailyRemaining}
                jobId={jobId}
                jobTitle={jobTitle}
                key={c.seekerId}
                onInviteSent={handleInviteSent}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
