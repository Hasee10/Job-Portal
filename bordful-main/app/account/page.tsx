import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';
import config from '@/config';

export const metadata: Metadata = {
  title: `My Account | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/account/sign-in?callbackUrl=/account');
  }
  // Employers already have their own dashboard at /dashboard - keep the
  // two account types on separate landing pages rather than branching
  // this one page on role.
  if (session.user.role === 'employer') {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl">
            Welcome, {session.user.name || session.user.email}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {session.user.email}.
          </p>

          <div className="mt-8 rounded-lg border p-6">
            <h2 className="font-semibold text-lg">Saved jobs</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Nothing saved yet - bookmark a listing from the jobs board and
              it&apos;ll show up here.
            </p>
          </div>

          <div className="mt-6 rounded-lg border p-6">
            <h2 className="font-semibold text-lg">Applications</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Application tracking lands here next.
            </p>
          </div>

          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
