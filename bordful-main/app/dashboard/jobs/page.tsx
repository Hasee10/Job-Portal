import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, Plus, Users } from 'lucide-react';
import { auth } from '@/auth';
import { JobStatusToggle } from '@/components/employer/JobStatusToggle';
import { listEmployerJobs } from '@/lib/jobs/employer-job-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `My Jobs | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EmployerJobsPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in?callbackUrl=/dashboard/jobs');
  if (session.user.role !== 'employer') redirect('/');

  const jobs = await listEmployerJobs(session.user.id);

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">My jobs</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Manage your listings and review applicants.
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              href="/dashboard/jobs/new"
            >
              <Plus className="h-4 w-4" />
              Post a job
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Briefcase className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="mt-3 font-medium text-zinc-900 dark:text-zinc-50">No jobs posted yet</p>
              <p className="mt-1 text-sm text-zinc-500">Post your first job to start receiving applications.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {jobs.map((job) => (
                <div
                  className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
                  key={job.id}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                          href={`/dashboard/jobs/${job.id}/edit`}
                        >
                          {job.title}
                        </Link>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            job.status === 'active'
                              ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                          }`}
                        >
                          {job.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {job.type}
                        {job.workplace_city ? ` · ${job.workplace_city}` : ''}
                        {job.workplace_type !== 'Not specified' ? ` · ${job.workplace_type}` : ''}
                      </p>
                    </div>
                    <JobStatusToggle isActive={job.status === 'active'} jobId={job.id} />
                  </div>

                  <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    {job.acceptsApplications && (
                      <Link
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        href={`/dashboard/jobs/${job.id}/applications`}
                      >
                        <Users className="h-3.5 w-3.5" />
                        {job.applicationCount} application{job.applicationCount !== 1 ? 's' : ''}
                      </Link>
                    )}
                    <Link
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      href={`/dashboard/jobs/${job.id}/candidates`}
                    >
                      Search candidates
                    </Link>
                    <Link
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      href={`/dashboard/jobs/${job.id}/edit`}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
