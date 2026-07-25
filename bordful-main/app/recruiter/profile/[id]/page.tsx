import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getRecruiterAccountById } from '@/lib/auth/recruiter-accounts';
import config from '@/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recruiter = await getRecruiterAccountById(id);
  if (!recruiter) return { title: `Recruiter | ${config.title}` };
  return {
    title: `${recruiter.name} | ${config.title}`,
    description: recruiter.bio ?? `${recruiter.name} is a recruiter on ${config.title}.`,
  };
}

export default async function RecruiterPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recruiter = await getRecruiterAccountById(id);
  if (!recruiter) notFound();

  const initials = recruiter.name.charAt(0).toUpperCase();
  const displayTitle = recruiter.agency
    ? `Recruiter at ${recruiter.agency}`
    : 'Independent Recruiter';

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-xl">
          <Link
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            href="/account/inbox"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to inbox
          </Link>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
            {/* Header */}
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-foreground text-xl">
                {initials}
              </span>
              <div className="min-w-0">
                <h1 className="font-bold text-xl text-zinc-900 dark:text-zinc-50">
                  {recruiter.name}
                </h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{displayTitle}</p>
                {recruiter.linkedinUrl && (
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    href={recruiter.linkedinUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Bio */}
            {recruiter.bio && (
              <div className="mt-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  About
                </h2>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                  {recruiter.bio}
                </p>
              </div>
            )}

            {/* Specialties */}
            {recruiter.specialties.length > 0 && (
              <div className="mt-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Specialties
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {recruiter.specialties.map((s) => (
                    <span
                      className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400"
                      key={s}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verification badge */}
            {recruiter.isVerified && (
              <div className="mt-5 flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
                  ✓
                </span>
                Verified recruiter
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
