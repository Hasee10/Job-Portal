import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { RecruiterForgotPasswordForm } from '@/components/auth/RecruiterForgotPasswordForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `Reset Password | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function RecruiterForgotPasswordPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Reset your password</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter the email on your recruiter account and we&apos;ll send a reset link.
          </p>
        </div>
        <Suspense fallback={null}>
          <RecruiterForgotPasswordForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Remembered it?{' '}
          <Link className="underline hover:no-underline" href="/recruiter/sign-in">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
