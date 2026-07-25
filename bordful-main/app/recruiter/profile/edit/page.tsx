import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RecruiterProfileForm } from '@/components/recruiter/RecruiterProfileForm';
import { getRecruiterAccountById } from '@/lib/auth/recruiter-accounts';
import config from '@/config';

export const metadata: Metadata = {
  title: `Edit Profile | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function RecruiterProfileEditPage() {
  const session = await auth();
  if (!session?.user) redirect('/recruiter/sign-in?callbackUrl=/recruiter/profile/edit');
  if (session.user.role !== 'recruiter') redirect('/');

  const recruiter = await getRecruiterAccountById(session.user.id);
  if (!recruiter) redirect('/recruiter/sign-in');

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-xl">
          <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">Edit profile</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Update your public recruiter profile. Verified profiles appear in the recruiter marketplace.
          </p>
          <div className="mt-8">
            <RecruiterProfileForm recruiter={recruiter} />
          </div>
        </div>
      </div>
    </main>
  );
}
