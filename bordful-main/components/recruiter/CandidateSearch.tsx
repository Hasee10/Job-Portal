'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CandidateCard } from './CandidateCard';
import type { OptInCandidate } from '@/lib/jobs/candidate-outreach-actions';

export function CandidateSearch({
  initial,
  initialDailyRemaining,
}: {
  initial: OptInCandidate[];
  initialDailyRemaining: number;
}) {
  const [candidates, setCandidates] = useState<OptInCandidate[]>(initial);
  const [dailyRemaining, setDailyRemaining] = useState(initialDailyRemaining);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchCandidates = useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const res = await fetch(`/api/recruiter/candidates?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setCandidates(data.candidates);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery !== '') fetchCandidates(debouncedQuery);
    else setCandidates(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const handleOutreachSent = (seekerId: string, remaining: number) => {
    setCandidates((prev) =>
      prev.map((c) => (c.seekerId === seekerId ? { ...c, outreachStatus: 'pending' } : c))
    );
    setDailyRemaining(remaining);
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          className="pl-9 pr-9"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, headline, or skill…"
          type="text"
          value={query}
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            onClick={() => setQuery('')}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Searching…</p>
      ) : candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">No candidates found</p>
          <p className="mt-1 text-sm text-zinc-500">
            {query ? 'Try a different search term.' : 'No candidates have opted in to recruiter outreach yet.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} available</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {candidates.map((c) => (
              <CandidateCard
                candidate={c}
                dailyRemaining={dailyRemaining}
                key={c.seekerId}
                onOutreachSent={handleOutreachSent}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
