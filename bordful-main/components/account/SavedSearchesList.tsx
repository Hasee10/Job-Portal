'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CAREER_LEVEL_DISPLAY_NAMES } from '@/lib/constants/career-levels';
import type { SavedSearch } from '@/lib/jobs/saved-search-actions';

function summarizeSavedSearch(search: SavedSearch): string {
  const parts: string[] = [];
  if (search.searchTerm) parts.push(`"${search.searchTerm}"`);
  if (search.filters.types.length) parts.push(search.filters.types.join(', '));
  if (search.filters.roles.length) {
    parts.push(
      search.filters.roles
        .map((role) => CAREER_LEVEL_DISPLAY_NAMES[role] || role)
        .join(', ')
    );
  }
  if (search.filters.remote) parts.push('Remote');
  if (search.filters.visa) parts.push('Visa sponsorship');
  if (search.filters.salaryMin > 0 || search.filters.salaryMax < 300_000) {
    parts.push(
      `$${(search.filters.salaryMin / 1000).toFixed(0)}K-${
        search.filters.salaryMax >= 300_000
          ? '+'
          : `$${(search.filters.salaryMax / 1000).toFixed(0)}K`
      }`
    );
  }
  return parts.length ? parts.join(' · ') : 'All jobs';
}

export function SavedSearchesList({
  savedSearches: initialSavedSearches,
}: {
  savedSearches: SavedSearch[];
}) {
  const [savedSearches, setSavedSearches] = useState(initialSavedSearches);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/seeker/saved-searches/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove saved search.');
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast({
        title: 'Could not remove saved search',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (savedSearches.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        No saved searches yet - use the &quot;Save search&quot; button on the
        jobs board to get emailed when new matches are posted.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {savedSearches.map((search) => (
        <li
          className="flex items-start justify-between gap-4 rounded-md border p-3"
          key={search.id}
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{search.name}</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {summarizeSavedSearch(search)}
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {search.frequency === 'daily' ? 'Daily' : 'Weekly'} email alerts
            </p>
          </div>
          <Button
            disabled={deletingId === search.id}
            onClick={() => handleDelete(search.id)}
            size="xs"
            variant="outline"
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
