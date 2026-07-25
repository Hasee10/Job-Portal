import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { EmployerCandidateSearch } from '@/components/employer/EmployerCandidateSearch';
import { getEmployerJob } from '@/lib/jobs/employer-job-actions';
import {
  getEmployerDailyInviteCount,
  searchCandidatesForJob,
} from '@/lib/jobs/employer-candidate-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `Search Candidates | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function JobCandidatesPage({
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

  const [candidates, dailyCount] = await Promise.all([
    searchCandidatesForJob(session.user.id, id),
    getEmployerDailyInviteCount(session.user.id),
  ]);
  const dailyRemaining = Math.max(0, 20 - dailyCount);

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <Link
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            href="/dashboard/jobs"
          >
            <ArrowLeft className="h-4 w-4" />
            My jobs
          </Link>

          <h1 className="mt-4 font-bold text-2xl text-zinc-900 dark:text-zinc-50">
            Search candidates for {job.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Candidates who&rsquo;ve opted in to outreach, ranked by match to this job&rsquo;s required skills.
          </p>

          <div className="mt-8">
            <EmployerCandidateSearch
              initial={candidates}
              initialDailyRemaining={dailyRemaining}
              jobId={id}
              jobTitle={job.title}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
