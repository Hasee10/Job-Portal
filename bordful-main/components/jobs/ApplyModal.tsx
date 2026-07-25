'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function ApplyModal({
  jobId,
  jobTitle,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [resumeSource, setResumeSource] = useState<'existing' | 'upload'>('existing');
  const [file, setFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resumeSource === 'upload' && !file) {
      toast({ title: 'Choose a resume file first.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('coverLetter', coverLetter.trim());
      formData.set('useExisting', resumeSource === 'existing' ? 'true' : 'false');
      if (resumeSource === 'upload' && file) {
        formData.set('file', file);
      }

      const res = await fetch(`/api/jobs/${jobId}/apply`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit application.');

      setSubmitted(true);
    } catch (err) {
      toast({
        title: 'Failed to apply',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">Sign in to apply</p>
          <p className="mt-1.5 text-sm text-zinc-500">Create a free account to submit your application.</p>
          <Button
            className="mt-4 w-full"
            onClick={() => router.push(`/account/sign-in?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
            <p className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">Application sent</p>
            <p className="mt-1 text-sm text-zinc-500">
              The employer will review your application for {jobTitle}.
            </p>
            <Button className="mt-4 w-full" onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <>
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">Apply to {jobTitle}</h2>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Resume</label>
                <div className="flex gap-2">
                  <button
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm ${
                      resumeSource === 'existing'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                    }`}
                    onClick={() => setResumeSource('existing')}
                    type="button"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Use saved resume
                  </button>
                  <button
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm ${
                      resumeSource === 'upload'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                    }`}
                    onClick={() => setResumeSource('upload')}
                    type="button"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload PDF
                  </button>
                </div>
                {resumeSource === 'upload' && (
                  <input
                    accept="application/pdf"
                    className="mt-2 block w-full text-sm text-zinc-500 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:file:bg-zinc-800 dark:file:text-zinc-200"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    type="file"
                  />
                )}
                {resumeSource === 'existing' && (
                  <p className="text-xs text-zinc-400">
                    Uses the resume from your account. If you haven&rsquo;t built one yet, switch to upload.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="apply-cover-letter">
                  Cover letter (optional)
                </label>
                <Textarea
                  id="apply-cover-letter"
                  maxLength={3000}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Why are you a good fit for this role?"
                  rows={5}
                  value={coverLetter}
                />
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Submitting…' : 'Submit application'}
                </Button>
                <Button disabled={isSubmitting} onClick={onClose} type="button" variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
