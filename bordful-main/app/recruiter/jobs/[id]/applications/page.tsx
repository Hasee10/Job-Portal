import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import { auth } from '@/auth';
import { ApplicationCard } from '@/components/employer/ApplicationCard';
import { getOwnerJob } from '@/lib/jobs/employer-job-actions';
import { listJobApplications } from '@/lib/jobs/application-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `Applications | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function RecruiterJobApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/recruiter/sign-in?callbackUrl=/recruiter/jobs');
  if (session.user.role !== 'recruiter') redirect('/');

  const { id } = await params;
  const job = await getOwnerJob({ recruiterId: session.user.id }, id);
  if (!job) notFound();

  const applications = await listJobApplications({ recruiterId: session.user.id }, id);
  const shortlisted = applications.filter((a) => a.status === 'shortlisted' || a.status === 'hired');
  const others = applications.filter((a) => a.status !== 'shortlisted' && a.status !== 'hired');

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <Link
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            href="/recruiter/jobs"
          >
            <ArrowLeft className="h-4 w-4" />
            My jobs
          </Link>

          <h1 className="mt-4 font-bold text-2xl text-zinc-900 dark:text-zinc-50">{job.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </p>

          {applications.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Inbox className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="mt-3 font-medium text-zinc-900 dark:text-zinc-50">No applications yet</p>
              <p className="mt-1 text-sm text-zinc-500">Applications will appear here as candidates apply.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {shortlisted.length > 0 && (
                <div>
                  <h2 className="font-semibold text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Shortlisted ({shortlisted.length})
                  </h2>
                  <div className="mt-3 space-y-3">
                    {shortlisted.map((app) => (
                      <ApplicationCard apiBasePath="/api/recruiter/applications" application={app} key={app.id} />
                    ))}
                  </div>
                </div>
              )}
              {others.length > 0 && (
                <div>
                  <h2 className="font-semibold text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    All other applications ({others.length})
                  </h2>
                  <div className="mt-3 space-y-3">
                    {others.map((app) => (
                      <ApplicationCard apiBasePath="/api/recruiter/applications" application={app} key={app.id} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
