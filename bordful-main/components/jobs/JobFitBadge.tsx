'use client';

import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type FitResult = {
  available: boolean;
  score?: number;
  reasoning?: string | null;
  matchedSkills?: string[];
  missingSkills?: string[];
};

function scoreTone(score: number): string {
  if (score >= 75) return 'border-green-600/30 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400';
  if (score >= 50) return 'border-amber-600/30 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400';
  return 'border-red-600/30 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400';
}

// Auto-runs on job page load for signed-in seekers with a resume on file -
// shows a fit score plus a matched/missing skills breakdown so a candidate
// can tell at a glance whether it's worth applying, instead of finding out
// only after writing a cover letter (see conversation: "an AI Engineer
// applies to a procurement job" as the failure mode this is meant to avoid).
export function JobFitBadge({ jobId }: { jobId: string }) {
  const { status } = useSession();
  const [result, setResult] = useState<FitResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/seeker/resume/fit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as FitResult;
        if (!cancelled) setResult(data);
      } catch {
        // Silent - a fit score is a nice-to-have, never worth surfacing an
        // error banner over on a job page.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, jobId]);

  if (status !== 'authenticated') return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-gray-500 text-xs dark:text-zinc-400">
        <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
        Checking your fit for this role…
      </div>
    );
  }
  if (!result?.available || typeof result.score !== 'number') return null;

  const { score, reasoning, matchedSkills = [], missingSkills = [] } = result;
  const hasBreakdown = matchedSkills.length > 0 || missingSkills.length > 0;

  return (
    <div className="rounded-md border border-gray-200 dark:border-zinc-800">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        disabled={!hasBreakdown}
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <Badge className={cn('border', scoreTone(score))} variant="outline">
            {score}% match
          </Badge>
          {reasoning && (
            <span className="text-gray-600 text-xs dark:text-zinc-400">{reasoning}</span>
          )}
        </div>
        {hasBreakdown &&
          (isOpen ? (
            <ChevronUp aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
          ))}
      </button>
      {isOpen && hasBreakdown && (
        <div className="grid grid-cols-1 gap-3 border-gray-200 border-t px-3 py-2.5 text-xs sm:grid-cols-2 dark:border-zinc-800">
          {matchedSkills.length > 0 && (
            <div>
              <div className="mb-1 font-medium text-gray-700 dark:text-zinc-300">
                Skills you have
              </div>
              <div className="flex flex-wrap gap-1">
                {matchedSkills.map((skill) => (
                  <span
                    className="rounded border border-green-600/20 bg-green-50 px-1.5 py-0.5 text-green-700 dark:bg-green-950 dark:text-green-400"
                    key={skill}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {missingSkills.length > 0 && (
            <div>
              <div className="mb-1 font-medium text-gray-700 dark:text-zinc-300">
                Skills to highlight or build
              </div>
              <div className="flex flex-wrap gap-1">
                {missingSkills.map((skill) => (
                  <span
                    className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-gray-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                    key={skill}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
