'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HarvardResumePreview } from '@/components/account/resume-templates/HarvardResumePreview';
import { ResumeAssistantWidget } from '@/components/account/ResumeAssistantWidget';
import { cn } from '@/lib/utils';
import type { TailoredResumeContent } from '@/lib/jobs/tailored-resume-types';
import type { PanelJobRef } from './ResumePanelProvider';

// Right-hand slide-over opened from a job page's "Generate tailored resume"
// button (see ResumePanelProvider, which pushes the page content left to
// make room for this instead of overlaying it). Fetches the seeker's saved
// resume, tailors it for this specific job, and shows the live Harvard-style
// preview plus a PDF download - full manual field editing lives on the
// account Resume builder page only; here the resume can still be adjusted
// via the embedded AI assistant (e.g. "use as summary").
export function TailoredResumePanel({
  job,
  onClose,
  isExpanded,
  onToggleExpand,
}: {
  job: PanelJobRef;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [needsResume, setNeedsResume] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<TailoredResumeContent | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      setUpgradeRequired(false);
      try {
        const resumeRes = await fetch('/api/seeker/resume');
        const resumeData = await resumeRes.json();
        const savedContent = resumeData.resume?.content;
        if (!savedContent || (!savedContent.fullName && savedContent.experience.length === 0)) {
          if (!cancelled) {
            setNeedsResume(true);
            setIsLoading(false);
          }
          return;
        }

        const tailorRes = await fetch('/api/seeker/resume/tailor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'resume', jobId: job.id, resume: savedContent }),
        });
        const tailorData = await tailorRes.json();
        if (!tailorRes.ok) {
          if (!cancelled) {
            setUpgradeRequired(Boolean(tailorData.upgradeRequired));
            setError(tailorData.error || 'Failed to generate tailored resume.');
          }
          return;
        }
        if (!cancelled) setTailoredResume(tailorData.output as TailoredResumeContent);
      } catch {
        if (!cancelled) setError('Something went wrong. Please try again.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, job.id]);

  const updateResume = (patch: Partial<TailoredResumeContent>) =>
    setTailoredResume((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleDownloadPdf = async () => {
    if (!tailoredResume) return;
    setIsDownloadingPdf(true);
    try {
      const [{ pdf }, { HarvardResumePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/account/resume-templates/HarvardResumePdf'),
      ]);
      const blob = await pdf(<HarvardResumePdf resume={tailoredResume} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tailoredResume.fullName || 'resume'}-tailored.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-zinc-200 bg-background shadow-2xl transition-[width] duration-300 ease-in-out dark:border-zinc-800',
        isExpanded ? 'lg:w-[760px]' : 'lg:w-[440px]'
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="font-semibold text-sm">Tailored resume</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {job.title} at {job.company}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
            className="hidden text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 lg:inline-flex"
            onClick={onToggleExpand}
            type="button"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            aria-label="Close tailored resume panel"
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {status !== 'authenticated' && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign in to generate a tailored resume.</p>
        )}

        {status === 'authenticated' && isLoading && (
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your tailored resume…
          </div>
        )}

        {needsResume && (
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p>You haven&apos;t saved a resume yet.</p>
            <a className="mt-1 inline-block text-primary underline" href="/account/resume">
              Build your resume first
            </a>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p>{error}</p>
            {upgradeRequired && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Premium plans are coming soon.
              </p>
            )}
          </div>
        )}

        {tailoredResume && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Preview</p>
              <Button disabled={isDownloadingPdf} onClick={handleDownloadPdf} size="xs" type="button">
                {isDownloadingPdf ? 'Preparing PDF...' : 'Download as PDF'}
              </Button>
            </div>
            <div className="rounded-md border">
              <HarvardResumePreview resume={tailoredResume} />
            </div>

            <div className="h-[26rem]">
              <ResumeAssistantWidget
                content={tailoredResume}
                onApplySummary={(text) => updateResume({ summary: text })}
                targetJob={{ title: job.title, company: job.company }}
                variant="embedded"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
