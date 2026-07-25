'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function OpenToRecruitersToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setIsSaving(true);
    try {
      const res = await fetch('/api/seeker/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openToRecruiters: next }),
      });
      if (!res.ok) throw new Error();
      toast({
        title: next ? 'Visible to recruiters' : 'Hidden from recruiters',
        description: next
          ? 'Recruiters can now discover your profile and send you messages.'
          : 'Your profile is no longer visible to recruiters.',
      });
    } catch {
      setEnabled(!next);
      toast({ title: 'Failed to update', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-50">Open to recruiters</p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {enabled
            ? 'Recruiters can discover your profile and send you messages.'
            : 'Your profile is hidden from recruiters.'}
        </p>
      </div>
      <button
        aria-label={enabled ? 'Disable recruiter visibility' : 'Enable recruiter visibility'}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          enabled ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
        } ${isSaving ? 'opacity-60 pointer-events-none' : ''}`}
        disabled={isSaving}
        onClick={toggle}
        role="switch"
        type="button"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
