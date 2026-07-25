import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { RecruiterSignUpForm } from '@/components/auth/RecruiterSignUpForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `Recruiter Sign Up | ${config.title}`,
  description: 'Create a recruiter account to discover and connect with job seekers.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function RecruiterSignUpPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Create a recruiter account</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Discover candidates who are open to opportunities and reach out directly.
          </p>
        </div>
        <Suspense fallback={null}>
          <RecruiterSignUpForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link className="underline hover:no-underline" href="/recruiter/sign-in">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Looking for jobs?{' '}
          <Link className="underline hover:no-underline" href="/account/sign-in">
            Job seeker sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Hiring?{' '}
          <Link className="underline hover:no-underline" href="/sign-up">
            Post a job
          </Link>
        </p>
      </div>
    </main>
  );
}
