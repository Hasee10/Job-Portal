import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `Reset Password | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Set a new password</h1>
        </div>
        {/* useSearchParams() (for the ?token=) requires a Suspense boundary
            in the App Router. */}
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
