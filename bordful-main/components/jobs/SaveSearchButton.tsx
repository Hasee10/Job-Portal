'use client';

import { Bell, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { SavedSearchFilters } from '@/lib/jobs/saved-search-matching';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';

type SaveSearchButtonProps = {
  filters: SavedSearchFilters;
  searchTerm: string;
  isSeeker: boolean;
};

export function SaveSearchButton({
  filters,
  searchTerm,
  isSeeker,
}: SaveSearchButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useOnClickOutside(panelRef, () => setOpen(false));

  if (!isSeeker) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/seeker/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          searchTerm: searchTerm || null,
          filters,
          frequency,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save search.');
      }

      toast({
        title: 'Search saved',
        description: "We'll email you when new matching jobs are posted.",
      });
      setName('');
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Could not save search',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <Button
        className="gap-1.5 text-xs"
        onClick={() => setOpen((v) => !v)}
        size="xs"
        type="button"
        variant="outline"
      >
        <Bell className="h-3.5 w-3.5" />
        Save search
      </Button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border bg-background p-4 shadow-lg">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="saved-search-name">
                Name this search
              </Label>
              <Input
                autoFocus
                className="h-8 text-xs"
                id="saved-search-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Remote React jobs"
                value={name}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="saved-search-frequency">
                Notify me
              </Label>
              <select
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                id="saved-search-frequency"
                onChange={(e) =>
                  setFrequency(e.target.value as 'daily' | 'weekly')
                }
                value={frequency}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Saves your current filters and keyword search. We&apos;ll email
              new matches to your account address.
            </p>
            <Button
              className="w-full gap-1.5 text-xs"
              disabled={isSubmitting || !name.trim()}
              size="xs"
              type="submit"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save search
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
