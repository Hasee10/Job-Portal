import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ResumeBuilder } from '@/components/account/ResumeBuilder';
import config from '@/config';
import { EMPTY_RESUME_CONTENT, getSeekerResume } from '@/lib/jobs/resume-actions';

export const metadata: Metadata = {
  title: `Resume builder | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ResumePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/account/sign-in?callbackUrl=/account/resume');
  }
  if (session.user.role !== 'seeker') {
    redirect('/account');
  }

  const resume = await getSeekerResume(session.user.id);

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl">Resume builder</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Build your resume once, then tailor it for individual jobs with
            AI.
          </p>
          <div className="mt-6">
            <ResumeBuilder
              initialContent={resume?.content ?? EMPTY_RESUME_CONTENT}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
