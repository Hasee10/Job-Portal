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

export default function SeekerSignInPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Save jobs and keep track of what you&apos;ve applied to. No
            password to remember - just your Google or LinkedIn account.
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
