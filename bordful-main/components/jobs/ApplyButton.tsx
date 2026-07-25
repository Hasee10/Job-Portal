'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplyModal } from '@/components/jobs/ApplyModal';
import { resolveColor } from '@/lib/utils/colors';
import config from '@/config';

export function ApplyButton({
  jobId,
  jobTitle,
  applyUrl,
  acceptsApplications,
}: {
  jobId: string;
  jobTitle: string;
  applyUrl: string;
  acceptsApplications: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  if (!acceptsApplications) {
    return (
      <Button
        asChild
        className="w-full gap-1.5 text-xs sm:w-auto"
        size="xs"
        style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
        variant="primary"
      >
        <a href={applyUrl} rel="noopener noreferrer" target="_blank">
          Apply Now
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button
        className="w-full gap-1.5 text-xs sm:w-auto"
        onClick={() => setShowModal(true)}
        size="xs"
        style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
        variant="primary"
      >
        Apply Now
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      {showModal && (
        <ApplyModal jobId={jobId} jobTitle={jobTitle} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
