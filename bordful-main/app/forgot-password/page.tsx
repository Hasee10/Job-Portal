import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `Forgot Password | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Reset your password</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-zinc-600">
          <Link className="underline hover:no-underline" href="/sign-in">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
