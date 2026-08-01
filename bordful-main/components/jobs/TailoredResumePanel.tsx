'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HarvardResumePreview } from '@/components/account/resume-templates/HarvardResumePreview';
import { ResumeAssistantWidget } from '@/components/account/ResumeAssistantWidget';
import type { TailoredResumeContent } from '@/lib/jobs/tailored-resume-types';
import type { PanelJobRef } from './ResumePanelProvider';

// Right-hand slide-over opened from a job page's "Generate tailored resume"
// button (see ResumePanelProvider, which pushes the page content left to
// make room for this instead of overlaying it). Fetches the seeker's saved
// resume, tailors it for this specific job, and lets them live-edit the
// structured result and download it as a Harvard-style PDF - all without
// leaving the job page.
export function TailoredResumePanel({
  job,
  onClose,
}: {
  job: PanelJobRef;
  onClose: () => void;
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

  const updateExperience = (
    index: number,
    patch: Partial<TailoredResumeContent['experience'][number]>
  ) =>
    setTailoredResume((prev) =>
      prev
        ? {
            ...prev,
            experience: prev.experience.map((entry, i) =>
              i === index ? { ...entry, ...patch } : entry
            ),
          }
        : prev
    );

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
    <div className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-zinc-200 bg-background shadow-2xl dark:border-zinc-800 lg:w-[440px]">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="font-semibold text-sm">Tailored resume</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {job.title} at {job.company}
          </p>
        </div>
        <button
          aria-label="Close tailored resume panel"
          className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
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
            <div className="space-y-3">
              <p className="text-sm font-medium">Edit</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  onChange={(e) => updateResume({ fullName: e.target.value })}
                  placeholder="Full name"
                  value={tailoredResume.fullName}
                />
                <Input
                  onChange={(e) => updateResume({ contact: e.target.value })}
                  placeholder="Contact"
                  value={tailoredResume.contact}
                />
              </div>
              <Input
                onChange={(e) => updateResume({ headline: e.target.value })}
                placeholder="Headline"
                value={tailoredResume.headline}
              />
              <Textarea
                onChange={(e) => updateResume({ summary: e.target.value })}
                placeholder="Summary"
                rows={3}
                value={tailoredResume.summary}
              />

              {tailoredResume.experience.map((entry, i) => (
                <div className="rounded-md border p-3" key={`panel-experience-${i}`}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      onChange={(e) => updateExperience(i, { title: e.target.value })}
                      placeholder="Title"
                      value={entry.title}
                    />
                    <Input
                      onChange={(e) => updateExperience(i, { company: e.target.value })}
                      placeholder="Company"
                      value={entry.company}
                    />
                  </div>
                  <Input
                    className="mt-2"
                    onChange={(e) => updateExperience(i, { dates: e.target.value })}
                    placeholder="Dates"
                    value={entry.dates}
                  />
                  <Textarea
                    className="mt-2"
                    onChange={(e) => updateExperience(i, { bullets: e.target.value.split('\n') })}
                    placeholder="One bullet point per line"
                    rows={4}
                    value={entry.bullets.join('\n')}
                  />
                </div>
              ))}

              <Input
                onChange={(e) =>
                  updateResume({
                    skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Skills (comma-separated)"
                value={tailoredResume.skills.join(', ')}
              />

              <Button disabled={isDownloadingPdf} onClick={handleDownloadPdf} type="button">
                {isDownloadingPdf ? 'Preparing PDF...' : 'Download as PDF'}
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Preview</p>
              <div className="origin-top scale-[0.62] transform">
                <HarvardResumePreview resume={tailoredResume} />
              </div>
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
