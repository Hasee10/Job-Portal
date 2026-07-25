import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { CompanyProfileForm } from '@/components/employer/CompanyProfileForm';
import { getEmployerById } from '@/lib/auth/employers';
import config from '@/config';

export const metadata: Metadata = {
  title: `Company Profile | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EmployerProfileEditPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in?callbackUrl=/dashboard/profile');
  if (session.user.role !== 'employer') redirect('/');

  const employer = await getEmployerById(session.user.id);
  if (!employer) redirect('/sign-in');

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-xl">
          <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">Company profile</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            This is what candidates see on your job listings and company page.
          </p>
          <div className="mt-8">
            <CompanyProfileForm employer={employer} />
          </div>
        </div>
      </div>
    </main>
  );
}
