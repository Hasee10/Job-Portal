import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { RecruiterSignInForm } from '@/components/auth/RecruiterSignInForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `Recruiter Sign In | ${config.title}`,
  description: 'Sign in to your recruiter account.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function RecruiterSignInPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Recruiter sign in</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Access your recruiter dashboard to discover and connect with candidates.
          </p>
        </div>
        <Suspense fallback={null}>
          <RecruiterSignInForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link className="underline hover:no-underline" href="/recruiter/sign-up">
            Sign up free
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Forgot your password?{' '}
          <Link className="underline hover:no-underline" href="/recruiter/forgot-password">
            Reset it
          </Link>
        </p>
      </div>
    </main>
  );
}
