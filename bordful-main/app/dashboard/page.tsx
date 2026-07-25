import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, Building2, Users } from 'lucide-react';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { getEmployerById } from '@/lib/auth/employers';
import { listEmployerJobs } from '@/lib/jobs/employer-job-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `Dashboard | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/dashboard');
  }
  if (session.user.role !== 'employer') redirect('/');

  const [employer, jobs] = await Promise.all([
    getEmployerById(session.user.id),
    listEmployerJobs(session.user.id),
  ]);

  const activeJobs = jobs.filter((j) => j.status === 'active');
  const totalApplications = jobs.reduce((sum, j) => sum + j.applicationCount, 0);

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-2xl">
              Welcome, {employer?.companyName || session.user.email}
            </h1>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {session.user.email}.
          </p>

          {!employer?.companyName && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Complete your company profile before posting a job.
              </p>
              <Link
                className="mt-2 inline-block text-sm font-medium text-amber-700 underline dark:text-amber-400"
                href="/dashboard/profile"
              >
                Set up company profile
              </Link>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-4">
              <p className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">{activeJobs.length}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Active jobs</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">{totalApplications}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total applications</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-zinc-400" />
                <div>
                  <h2 className="font-semibold text-lg">Job postings</h2>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    Post new jobs and review applicants.
                  </p>
                </div>
              </div>
              <Link className="shrink-0 rounded-md border px-4 py-2 font-medium text-sm hover:bg-accent" href="/dashboard/jobs">
                Open
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-lg border p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-zinc-400" />
                <div>
                  <h2 className="font-semibold text-lg">Company profile</h2>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    What candidates see on your listings.
                  </p>
                </div>
              </div>
              <Link className="shrink-0 rounded-md border px-4 py-2 font-medium text-sm hover:bg-accent" href="/dashboard/profile">
                Edit
              </Link>
            </div>
          </div>

          {activeJobs.length > 0 && (
            <div className="mt-6 rounded-lg border p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-zinc-400" />
                  <div>
                    <h2 className="font-semibold text-lg">Search candidates</h2>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      Find and invite candidates for your open roles.
                    </p>
                  </div>
                </div>
                <Link
                  className="shrink-0 rounded-md border px-4 py-2 font-medium text-sm hover:bg-accent"
                  href={`/dashboard/jobs/${activeJobs[0].id}/candidates`}
                >
                  Open
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
