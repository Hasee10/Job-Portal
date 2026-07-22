'use client';

import { Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function GenerateResumeButton({
  jobId,
  className = '',
}: {
  jobId: string;
  className?: string;
}) {
  const { status } = useSession();
  const router = useRouter();

  const handleClick = () => {
    const target = `/account/resume?jobId=${encodeURIComponent(jobId)}`;
    if (status !== 'authenticated') {
      router.push(`/account/sign-in?callbackUrl=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  return (
    <Button
      className={`gap-1.5 text-xs ${className}`}
      onClick={handleClick}
      size="xs"
      type="button"
      variant="outline"
    >
      <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
      Generate tailored resume
    </Button>
  );
}
