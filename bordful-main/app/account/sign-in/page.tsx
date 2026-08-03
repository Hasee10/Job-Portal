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
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center bg-gradient-to-b from-zinc-50 to-white py-16 dark:from-zinc-950 dark:to-background">
      <div className="container mx-auto px-4">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <Image
              alt=""
              className="mx-auto mb-6 dark:hidden"
              height={60}
              priority
              src="/caliber-bowtie.svg"
              width={80}
            />
            <Image
              alt=""
              className="mx-auto mb-6 hidden dark:block"
              height={60}
              priority
              src="/caliber-bowtie-light.svg"
              width={80}
            />
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
