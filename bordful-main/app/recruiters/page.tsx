import { Lock, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { RecruiterCard } from '@/components/recruiters/RecruiterCard';
import { RecruiterRequestForm } from '@/components/recruiters/RecruiterRequestForm';
import config from '@/config';
import { getSeekerTier } from '@/lib/jobs/entitlements-actions';
import { listActiveRecruiters } from '@/lib/jobs/recruiter-actions';

export const metadata: Metadata = {
  title: `Work with a recruiter | ${config.title}`,
  description:
    'Connect with recruiters who can help match you with the right opportunity.',
};

export const dynamic = 'force-dynamic';

export default async function RecruitersPage() {
  const [session, recruiters] = await Promise.all([
    auth(),
    listActiveRecruiters(),
  ]);
  const isSeeker = session?.user?.role === 'seeker';
  const tier = isSeeker ? await getSeekerTier(session?.user.id as string) : 'free';
  const isPremium = tier === 'premium';

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Work with a recruiter
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Get matched with a recruiter who specializes in your field.
          </p>

          {!isPremium ? (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Lock aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">
                Connecting with recruiters is a Premium feature
              </p>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                {isSeeker
                  ? 'Upgrade to Premium to reach out to recruiters in our network.'
                  : 'Sign in as a job seeker and upgrade to Premium to reach out to recruiters in our network.'}
              </p>
              <Link
                className="mt-5 inline-block rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
                href={isSeeker ? '/pricing' : '/account/sign-in?callbackUrl=/recruiters'}
              >
                {isSeeker ? 'View Premium plans' : 'Sign in'}
              </Link>
            </div>
          ) : recruiters.length === 0 ? (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-zinc-200 border-dashed bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
                <Users aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">
                Our recruiter marketplace is launching soon
              </p>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                Leave your details below and we&apos;ll match you with a
                recruiter as soon as one is available.
              </p>
              <div className="mt-5 text-left">
                <RecruiterRequestForm isSeeker={isSeeker} />
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {recruiters.map((recruiter) => (
                <RecruiterCard
                  isSeeker={isSeeker}
                  key={recruiter.id}
                  recruiter={recruiter}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
