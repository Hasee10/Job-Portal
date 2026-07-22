import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { OnboardingQuiz } from '@/components/account/OnboardingQuiz';
import config from '@/config';
import { DEFAULT_SAVED_SEARCH_FILTERS } from '@/lib/jobs/saved-search-matching';
import { getSeekerProfile } from '@/lib/jobs/seeker-profile-actions';

export const metadata: Metadata = {
  title: `Personalize your job feed | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/account/sign-in?callbackUrl=/account/onboarding');
  }
  if (session.user.role !== 'seeker') {
    redirect('/account');
  }

  const profile = await getSeekerProfile(session.user.id);

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-lg">
          <h1 className="font-bold text-2xl">Let&apos;s personalize your job feed</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Answer a few quick questions and we&apos;ll surface jobs that
            actually fit what you&apos;re looking for.
          </p>
          <div className="mt-6">
            <OnboardingQuiz
              initialFilters={profile?.filters ?? DEFAULT_SAVED_SEARCH_FILTERS}
              initialSearchTerm={profile?.searchTerm ?? ''}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
