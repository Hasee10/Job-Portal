import type { Metadata } from 'next';
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
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">
            {isSignUp ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Save jobs and keep track of what you&apos;ve applied to. No
            password to remember - just continue with your Google or LinkedIn
            account{isSignUp ? ' to get started' : ''}.
          </p>
        </div>
        {/* useSearchParams() (for the post-login callbackUrl) requires a
            Suspense boundary in the App Router. */}
        <Suspense fallback={null}>
          <SeekerSignInButtons />
        </Suspense>
      </div>
    </main>
  );
}
