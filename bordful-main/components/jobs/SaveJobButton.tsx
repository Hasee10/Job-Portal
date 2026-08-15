'use client';

import { Bookmark } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSeekerJobState } from '@/components/jobs/SeekerJobStateContext';
import { Button } from '@/components/ui/button';

export function SaveJobButton({
  jobId,
  className = '',
}: {
  jobId: string;
  className?: string;
}) {
  const { data: session, status } = useSession();
  const { savedJobIds, toggleSave } = useSeekerJobState();
  const router = useRouter();
  const isSaved = savedJobIds.has(jobId);

  // Saving is seeker-only server-side (see /api/seeker/saved-jobs) - a
  // signed-in non-seeker (employer/recruiter) would previously pass the
  // "is anyone signed in" check below, see the button optimistically fill
  // in, then silently revert with no explanation when the request 401s.
  // Hiding the button entirely for that case is more honest than letting
  // them click something that can never actually work for their account.
  if (status === 'authenticated' && session?.user?.role && session.user.role !== 'seeker') {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status !== 'authenticated') {
      router.push(
        `/account/sign-in?callbackUrl=${encodeURIComponent(
          window.location.pathname
        )}`
      );
      return;
    }

    toggleSave(jobId);
  };

  return (
    <Button
      aria-label={isSaved ? 'Unsave job' : 'Save job'}
      aria-pressed={isSaved}
      className={`h-7 w-7 p-0 ${className}`}
      onClick={handleClick}
      size="icon"
      type="button"
      variant="outline"
    >
      <Bookmark
        aria-hidden="true"
        className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
      />
    </Button>
  );
}
