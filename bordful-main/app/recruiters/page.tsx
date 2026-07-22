import type { Metadata } from 'next';
import { auth } from '@/auth';
import { RecruiterRequestForm } from '@/components/recruiters/RecruiterRequestForm';
import config from '@/config';
import { listActiveRecruiters } from '@/lib/jobs/recruiter-actions';

export const metadata: Metadata = {
  title: `Work with a recruiter | ${config.title}`,
  description:
    'Connect with recruiters who can help match you with the right opportunity.',
};

export const dynamic = 'force-dynamic';

export default async function RecruitersPage() {
  const [session, recruiters] = await Promise.all([
    auth(),
    listActiveRecruiters(),
  ]);
  const isSeeker = session?.user?.role === 'seeker';

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl">Work with a recruiter</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Get matched with a recruiter who specializes in your field.
          </p>

          {recruiters.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium text-sm">
                Our recruiter marketplace is launching soon.
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Leave your details below and we&apos;ll match you with a
                recruiter as soon as one is available.
              </p>
              <div className="mt-4 text-left">
                <RecruiterRequestForm isSeeker={isSeeker} />
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {recruiters.map((recruiter) => (
                <div className="rounded-lg border p-6" key={recruiter.id}>
                  <h2 className="font-semibold text-lg">{recruiter.name}</h2>
                  {(recruiter.title || recruiter.company) && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {[recruiter.title, recruiter.company]
                        .filter(Boolean)
                        .join(' at ')}
                    </p>
                  )}
                  {recruiter.bio && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {recruiter.bio}
                    </p>
                  )}
                  {recruiter.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {recruiter.specialties.map((specialty) => (
                        <span
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                          key={specialty}
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <RecruiterRequestForm
                      isSeeker={isSeeker}
                      recruiterId={recruiter.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
