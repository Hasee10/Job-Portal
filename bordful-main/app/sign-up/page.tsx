import type { Metadata } from 'next';
import Link from 'next/link';
import { SignUpForm } from '@/components/auth/SignUpForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `Sign Up | ${config.title}`,
  description: 'Create an employer account to post and feature jobs.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Create an employer account</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Post jobs and feature listings above the aggregated noise.
          </p>
        </div>
        <SignUpForm />
        <p className="mt-6 text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link className="underline hover:no-underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
