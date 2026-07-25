import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { JobPostForm } from '@/components/employer/JobPostForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `Post a Job | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NewRecruiterJobPage() {
  const session = await auth();
  if (!session?.user) redirect('/recruiter/sign-in?callbackUrl=/recruiter/jobs/new');
  if (session.user.role !== 'recruiter') redirect('/');

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">Post a job</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            This listing goes live immediately on the job board, credited to your agency.
          </p>
          <div className="mt-8">
            <JobPostForm apiBasePath="/api/recruiter/jobs" jobsListPath="/recruiter/jobs" />
          </div>
        </div>
      </div>
    </main>
  );
}
