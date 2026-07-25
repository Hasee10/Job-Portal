import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, UserCheck, Mail } from 'lucide-react';
import { auth } from '@/auth';
import { listRecruiterOutreach } from '@/lib/jobs/candidate-outreach-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `My Outreach | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_CONFIG = {
  pending: { label: 'Sent', icon: Clock, className: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400' },
  read: { label: 'Viewed', icon: UserCheck, className: 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400' },
  accepted: { label: 'Accepted', icon: CheckCircle, className: 'text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-400' },
  declined: { label: 'Declined', icon: XCircle, className: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400' },
} as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function RecruiterPipelinePage() {
  const session = await auth();
  if (!session?.user) redirect('/recruiter/sign-in');
  if (session.user.role !== 'recruiter') redirect('/');

  const outreach = await listRecruiterOutreach(session.user.id);

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">

          <div className="flex items-center gap-3">
            <Link
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1"
              href="/recruiter/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>

          <h1 className="mt-4 font-bold text-2xl text-zinc-900 dark:text-zinc-50">My outreach</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {outreach.length} message{outreach.length !== 1 ? 's' : ''} sent
          </p>

          {outreach.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">No outreach yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Go to the{' '}
                <Link className="underline" href="/recruiter/dashboard">candidate list</Link>{' '}
                and send your first message.
              </p>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {outreach.map((item) => {
                const sc = STATUS_CONFIG[item.status];
                const Icon = sc.icon;
                const displayName = item.seekerName || item.seekerEmail.split('@')[0];

                return (
                  <div className="bg-white dark:bg-zinc-900/60 p-5" key={item.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 truncate">
                            {displayName}
                          </span>
                          {item.seekerHeadline && (
                            <span className="text-xs text-zinc-400 truncate">{item.seekerHeadline}</span>
                          )}
                        </div>
                        {item.seekerSkills.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.seekerSkills.slice(0, 5).map((s) => (
                              <span
                                className="rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                key={s}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
                          <Icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                        <span className="text-xs text-zinc-400">{formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {item.message}
                    </p>

                    {item.status === 'accepted' && (
                      <a
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 font-medium"
                        href={`mailto:${item.seekerEmail}`}
                      >
                        <Mail className="h-3 w-3" />
                        {item.seekerEmail}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
