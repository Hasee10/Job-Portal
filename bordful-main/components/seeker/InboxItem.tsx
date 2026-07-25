'use client';

import { useState } from 'react';
import { Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { OutreachWithRecruiter } from '@/lib/jobs/candidate-outreach-actions';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function InboxItem({ item: initial }: { item: OutreachWithRecruiter }) {
  const [item, setItem] = useState(initial);
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();

  const respond = async (action: 'accept' | 'decline') => {
    setIsResponding(true);
    try {
      const res = await fetch(`/api/seeker/inbox/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItem((prev) => ({ ...prev, status: data.outreach.status }));
      toast({
        title: action === 'accept' ? 'Request accepted' : 'Request declined',
        description:
          action === 'accept'
            ? "The recruiter's contact info is now visible."
            : 'The recruiter has been notified.',
      });
    } catch {
      toast({ title: 'Action failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsResponding(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'border-l-amber-400',
    read: 'border-l-blue-400',
    accepted: 'border-l-green-500',
    declined: 'border-l-zinc-300 dark:border-l-zinc-600',
  };

  return (
    <div className={`rounded-xl border border-zinc-200 bg-white border-l-4 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 ${statusColors[item.status] ?? ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
              {item.recruiterName}
            </span>
            {item.recruiterAgency && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                · {item.recruiterAgency}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{formatDate(item.createdAt)}</p>
        </div>

        {item.status === 'accepted' && (
          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
            Connected
          </span>
        )}
        {item.status === 'declined' && (
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
            Declined
          </span>
        )}
      </div>

      {item.recruiterSpecialties.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.recruiterSpecialties.slice(0, 4).map((s) => (
            <span
              className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400"
              key={s}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
        {item.message}
      </p>

      {item.status === 'accepted' && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-500/20 dark:bg-green-500/10">
          <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">Recruiter contact info</p>
          {item.recruiterLinkedinUrl && (
            <a
              className="inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-400 underline hover:no-underline"
              href={item.recruiterLinkedinUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              LinkedIn profile <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {item.recruiterBio && (
            <p className="mt-1 text-xs text-green-700 dark:text-green-400">{item.recruiterBio}</p>
          )}
        </div>
      )}

      {(item.status === 'pending' || item.status === 'read') && (
        <div className="mt-4 flex gap-2">
          <Button
            className="h-8 gap-1.5 text-xs"
            disabled={isResponding}
            onClick={() => respond('accept')}
            size="sm"
          >
            <Check className="h-3 w-3" />
            Accept
          </Button>
          <Button
            className="h-8 gap-1.5 text-xs"
            disabled={isResponding}
            onClick={() => respond('decline')}
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
