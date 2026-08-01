'use client';

import { Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useResumePanel } from '@/components/jobs/ResumePanelProvider';

export function GenerateResumeButton({
  jobId,
  jobSlug,
  jobTitle,
  jobCompany,
  className = '',
}: {
  jobId: string;
  jobSlug: string;
  jobTitle: string;
  jobCompany: string;
  className?: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const { open } = useResumePanel();

  const handleClick = () => {
    if (status !== 'authenticated') {
      router.push(`/account/sign-in?callbackUrl=${encodeURIComponent(`/jobs/${jobSlug}`)}`);
      return;
    }
    open({ id: jobId, title: jobTitle, company: jobCompany });
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
