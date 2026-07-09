import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';
import config from '@/config';

export const metadata: Metadata = {
  title: `Dashboard | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/dashboard');
  }

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl">
            Welcome, {session.user.name || session.user.email}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Signed in as {session.user.email}.
          </p>

          <div className="mt-8 rounded-lg border p-6">
            <h2 className="font-semibold text-lg">Employer dashboard</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Job posting management, featured listings, and applicant
              tracking land here next - sign-in/sign-up is wired and working;
              this is a placeholder for the tools those tie into.
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
