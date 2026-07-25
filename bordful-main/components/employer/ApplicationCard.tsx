'use client';

import { useState } from 'react';
import { Check, X, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ApplicationStatus, ApplicationWithSeeker } from '@/lib/jobs/application-actions';

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  new: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  reviewed: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  shortlisted: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  rejected: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  hired: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
};

export function ApplicationCard({ application: initial }: { application: ApplicationWithSeeker }) {
  const [application, setApplication] = useState(initial);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const displayName = application.seekerName || application.seekerEmail.split('@')[0];

  const setStatus = async (status: ApplicationStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/employer/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setApplication((prev) => ({ ...prev, status }));
      toast({ title: `Marked as ${status}` });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{displayName}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[application.status]}`}>
              {application.status}
            </span>
            {application.autoShortlisted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <Star className="h-3 w-3" />
                Auto-shortlisted
              </span>
            )}
          </div>
          {application.resumeSnapshot.headline && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{application.resumeSnapshot.headline}</p>
          )}
          <p className="mt-0.5 text-xs text-zinc-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Applied {new Date(application.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold text-lg text-zinc-900 dark:text-zinc-50">{application.matchScore}%</p>
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
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line line-clamp-4">
          {application.coverLetter}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <a
          className="text-xs text-primary hover:underline"
          href={`mailto:${application.seekerEmail}`}
        >
          {application.seekerEmail}
        </a>
        <div className="flex gap-2">
          {application.status !== 'shortlisted' && application.status !== 'hired' && (
            <Button disabled={isUpdating} onClick={() => setStatus('shortlisted')} size="sm" variant="outline" className="h-7 gap-1 text-xs">
              <Check className="h-3 w-3" />
              Shortlist
            </Button>
          )}
          {application.status !== 'rejected' && (
            <Button disabled={isUpdating} onClick={() => setStatus('rejected')} size="sm" variant="outline" className="h-7 gap-1 text-xs">
              <X className="h-3 w-3" />
              Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
