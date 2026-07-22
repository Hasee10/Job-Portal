import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SavedSearchesList } from '@/components/account/SavedSearchesList';
import { SignOutButton } from '@/components/auth/SignOutButton';
import config from '@/config';
import { getJobs } from '@/lib/db/airtable.server';
import { listSavedSearches } from '@/lib/jobs/saved-search-actions';
import { matchesSavedSearch } from '@/lib/jobs/saved-search-matching';
import { getSavedJobsWithDetails, getSeekerJobState } from '@/lib/jobs/seeker-actions';
import { getSeekerProfile } from '@/lib/jobs/seeker-profile-actions';
import { generateJobSlug } from '@/lib/utils/slugify';

const MAX_RECOMMENDED_JOBS = 10;

export const metadata: Metadata = {
  title: `My Account | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/account/sign-in?callbackUrl=/account');
  }
  // Employers already have their own dashboard at /dashboard - keep the
  // two account types on separate landing pages rather than branching
  // this one page on role.
  if (session.user.role === 'employer') {
    redirect('/dashboard');
  }

  const [savedJobs, jobState, savedSearches, profile] = await Promise.all([
    getSavedJobsWithDetails(session.user.id),
    getSeekerJobState(session.user.id),
    listSavedSearches(session.user.id),
    getSeekerProfile(session.user.id),
  ]);

  const appliedJobs = savedJobs.filter(
    (job) => jobState.applications[job.jobId] === 'applied'
  );
  const applicationEntries = Object.entries(jobState.applications);

  const recommendedJobs = profile?.onboardingCompletedAt
    ? (await getJobs())
        .filter((job) => matchesSavedSearch(job, profile.filters, profile.searchTerm))
        .sort(
          (a, b) =>
            new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
        )
        .slice(0, MAX_RECOMMENDED_JOBS)
    : [];

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl">
            Welcome, {session.user.name || session.user.email}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {session.user.email}.
          </p>

          {!profile?.onboardingCompletedAt && (
            <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-zinc-900 bg-zinc-50 p-6 dark:border-zinc-100 dark:bg-zinc-900">
              <div>
                <h2 className="font-semibold text-lg">
                  Personalize your job feed
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Answer a few quick questions and we&apos;ll recommend jobs
                  that fit what you&apos;re looking for.
                </p>
              </div>
              <Link
                className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 font-medium text-sm text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                href="/account/onboarding"
              >
                Get started
              </Link>
            </div>
          )}

          {recommendedJobs.length > 0 && (
            <div className="mt-8 rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Recommended for you</h2>
                <Link
                  className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
                  href="/account/onboarding"
                >
                  Edit preferences
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {recommendedJobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      className="truncate font-medium text-sm hover:underline"
                      href={`/jobs/${generateJobSlug(job.title, job.company)}`}
                    >
                      {job.title}
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {' '}
                        &middot; {job.company}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 rounded-lg border p-6">
            <h2 className="font-semibold text-lg">Saved jobs</h2>
            {savedJobs.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Nothing saved yet - bookmark a listing from the jobs board and
                it&apos;ll show up here.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {savedJobs.map((job) => (
                  <li
                    className="flex items-center justify-between gap-4"
                    key={job.jobId}
                  >
                    <Link
                      className="min-w-0 flex-1 truncate font-medium text-sm hover:underline"
                      href={`/jobs/${generateJobSlug(job.title, job.company ?? '')}`}
                    >
                      {job.title}
                      {job.company && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {' '}
                          &middot; {job.company}
                        </span>
                      )}
                    </Link>
                    {jobState.applications[job.jobId] === 'applied' && (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                        Applied
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-lg border p-6">
            <h2 className="font-semibold text-lg">Applications</h2>
            {applicationEntries.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Mark a job as applied from its listing page and it&apos;ll show
                up here.
              </p>
            ) : appliedJobs.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                You&apos;ve marked jobs as applied, but they&apos;re no longer
                in your saved jobs list.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {appliedJobs.map((job) => (
                  <li key={job.jobId}>
                    <Link
                      className="truncate font-medium text-sm hover:underline"
                      href={`/jobs/${generateJobSlug(job.title, job.company ?? '')}`}
                    >
                      {job.title}
                      {job.company && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {' '}
                          &middot; {job.company}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-lg border p-6">
            <h2 className="font-semibold text-lg">Saved searches</h2>
            <SavedSearchesList savedSearches={savedSearches} />
          </div>

          <div className="mt-6 rounded-lg border p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-lg">Resume builder</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Build your resume and tailor it for specific jobs with AI.
                </p>
              </div>
              <Link
                className="shrink-0 rounded-md border px-4 py-2 font-medium text-sm hover:bg-accent"
                href="/account/resume"
              >
                Open
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
