import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { SeekerSignInButtons } from '@/components/auth/SeekerSignInButtons';
import config from '@/config';

export const metadata: Metadata = {
  title: `Sign In | ${config.title}`,
  description: 'Sign in to save jobs and track your applications.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SeekerSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  // Sign up and sign in are the same OAuth action (an account is created on
  // first login), so there's no separate signup form - this just adjusts
  // the heading so "Sign up" doesn't look like a dead link to a page that
  // never showed up.
  const isSignUp = intent === 'signup';

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-zinc-50 to-white py-10 dark:from-zinc-950 dark:to-background">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
          <Image
            alt="A recruiter and a job seeker connecting through Caliber, signing in with Google or LinkedIn"
            className="mx-auto h-auto w-full"
            height={657}
            priority
            src="/signin-illustration.png"
            width={1417}
          />
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-bold text-3xl tracking-tight">
              {isSignUp ? 'Create your account' : 'Sign in'}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Save jobs and keep track of what you&apos;ve applied to. No
              password to remember - just continue with your Google or
              LinkedIn account{isSignUp ? ' to get started' : ''}.
            </p>
          </div>

          {/* useSearchParams() (for the post-login callbackUrl) requires a
              Suspense boundary in the App Router. */}
          <Suspense fallback={null}>
            <SeekerSignInButtons />
          </Suspense>

          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
            Free forever · No spam · Takes under a minute
          </p>

          <div className="mt-8 space-y-2 border-zinc-200 border-t pt-6 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Hiring?{' '}
              <Link className="font-medium underline hover:no-underline" href="/sign-up">
                Post a job
              </Link>
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you a recruiter?{' '}
              <Link
                className="font-medium underline hover:no-underline"
                href="/recruiter/sign-up"
              >
                Recruiter sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
