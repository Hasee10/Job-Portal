'use client';

import { Check, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSeekerJobState } from '@/components/jobs/SeekerJobStateContext';
import { Button } from '@/components/ui/button';

export function JobApplicationActions({ jobId }: { jobId: string }) {
  const { status } = useSession();
  const { applications, setApplication, clearApplication } =
    useSeekerJobState();
  const router = useRouter();
  const current = applications[jobId];

  const handle = (target: 'applied' | 'not_interested') => {
    if (status !== 'authenticated') {
      router.push(
        `/account/sign-in?callbackUrl=${encodeURIComponent(
          window.location.pathname
        )}`
      );
      return;
    }

    if (current === target) {
      clearApplication(jobId);
    } else {
      setApplication(jobId, target);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        aria-pressed={current === 'applied'}
        className="gap-1.5 text-xs"
        onClick={() => handle('applied')}
        size="xs"
        type="button"
        variant={current === 'applied' ? 'default' : 'outline'}
      >
        <Check aria-hidden="true" className="h-3.5 w-3.5" />
        {current === 'applied' ? 'Applied' : 'Mark as applied'}
      </Button>
      <Button
        aria-pressed={current === 'not_interested'}
        className="gap-1.5 text-xs"
        onClick={() => handle('not_interested')}
        size="xs"
        type="button"
        variant={current === 'not_interested' ? 'default' : 'outline'}
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
        Not interested
      </Button>
    </div>
  );
}
