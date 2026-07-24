'use client';

import { Bell, BellOff, Trash2 } from 'lucide-react';
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
      <div className="mt-4 flex items-start gap-3 rounded-md border border-dashed p-4">
        <BellOff
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No saved searches yet - use the &quot;Save search&quot; button on
          the jobs board to get emailed when new matches are posted.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-2.5">
      {savedSearches.map((search) => (
        <li
          className="group flex items-start justify-between gap-4 rounded-md border p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
          key={search.id}
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{search.name}</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {summarizeSavedSearch(search)}
            </p>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <Bell aria-hidden="true" className="h-3 w-3" />
              {search.frequency === 'daily' ? 'Daily' : 'Weekly'} email alerts
            </p>
          </div>
          <Button
            className="shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
            disabled={deletingId === search.id}
            onClick={() => handleDelete(search.id)}
            size="xs"
            variant="outline"
          >
            <Trash2 aria-hidden="true" className="h-3 w-3" />
            {deletingId === search.id ? 'Removing...' : 'Remove'}
          </Button>
        </li>
      ))}
    </ul>
  );
}
