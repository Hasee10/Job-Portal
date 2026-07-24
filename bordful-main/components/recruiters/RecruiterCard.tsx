import Image from 'next/image';
import { RecruiterRequestForm } from '@/components/recruiters/RecruiterRequestForm';
import type { Recruiter } from '@/lib/jobs/recruiter-actions';

export function RecruiterCard({
  recruiter,
  isSeeker,
}: {
  recruiter: Recruiter;
  isSeeker: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_8px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-start gap-3">
        {recruiter.avatarUrl ? (
          <Image
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover"
            height={48}
            src={recruiter.avatarUrl}
            width={48}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground text-lg"
          >
            {recruiter.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-50">
            {recruiter.name}
          </h2>
          {(recruiter.title || recruiter.company) && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {[recruiter.title, recruiter.company].filter(Boolean).join(' at ')}
            </p>
          )}
        </div>
      </div>

      {recruiter.bio && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          {recruiter.bio}
        </p>
      )}

      {recruiter.specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recruiter.specialties.map((specialty) => (
            <span
              className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 font-medium text-cyan-700 text-xs dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400"
              key={specialty}
            >
              {specialty}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 border-zinc-100 border-t pt-4 dark:border-zinc-800">
        <RecruiterRequestForm isSeeker={isSeeker} recruiterId={recruiter.id} />
      </div>
    </div>
  );
}
