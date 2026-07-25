import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RecruiterResetPasswordForm } from '@/components/auth/RecruiterResetPasswordForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `Set New Password | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function RecruiterResetPasswordPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Set a new password</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Choose a new password for your recruiter account.
          </p>
        </div>
        <Suspense fallback={null}>
          <RecruiterResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
