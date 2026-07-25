'use client';

import { useState } from 'react';
import { Send, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OutreachModal } from './OutreachModal';
import type { OptInCandidate } from '@/lib/jobs/candidate-outreach-actions';

const STATUS_BADGE: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: {
    label: 'Sent',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  read: {
    label: 'Viewed',
    icon: <UserCheck className="h-3 w-3" />,
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  },
  accepted: {
    label: 'Accepted',
    icon: <CheckCircle className="h-3 w-3" />,
    className: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  },
  declined: {
    label: 'Declined',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  },
};

export function CandidateCard({
  candidate,
  dailyRemaining,
  onOutreachSent,
}: {
  candidate: OptInCandidate;
  dailyRemaining: number;
  onOutreachSent: (seekerId: string, remaining: number) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const displayName = candidate.name || 'Anonymous';
  const initials = displayName.charAt(0).toUpperCase();
  const statusInfo = candidate.outreachStatus ? STATUS_BADGE[candidate.outreachStatus] : null;

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 truncate">
                {displayName}
              </h3>
              {statusInfo && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              )}
            </div>
            {candidate.headline && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {candidate.headline}
              </p>
            )}
          </div>
        </div>

        {candidate.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, 8).map((skill) => (
              <span
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                key={skill}
              >
                {skill}
              </span>
            ))}
            {candidate.skills.length > 8 && (
              <span className="text-xs text-zinc-400 self-center">+{candidate.skills.length - 8} more</span>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {candidate.outreachStatus === 'accepted' ? (
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              Contact: {candidate.email}
            </p>
          ) : candidate.outreachStatus ? (
            <p className="text-xs text-zinc-400">Outreach already sent</p>
          ) : (
            <Button
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowModal(true)}
              size="sm"
              variant="outline"
            >
              <Send className="h-3 w-3" />
              Send outreach
            </Button>
          )}
        </div>
      </div>

      {showModal && (
        <OutreachModal
          candidate={candidate}
          dailyRemaining={dailyRemaining}
          onClose={() => setShowModal(false)}
          onSent={onOutreachSent}
        />
      )}
    </>
  );
}
