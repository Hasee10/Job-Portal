import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { JobPostForm } from '@/components/employer/JobPostForm';
import { getEmployerJob } from '@/lib/jobs/employer-job-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `Edit Job | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in?callbackUrl=/dashboard/jobs');
  if (session.user.role !== 'employer') redirect('/');

  const { id } = await params;
  const job = await getEmployerJob(session.user.id, id);
  if (!job) notFound();

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">Edit job</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{job.title}</p>
          <div className="mt-8">
            <JobPostForm job={job} />
          </div>
        </div>
      </div>
    </main>
  );
}
