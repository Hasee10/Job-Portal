import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users, Send, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { CandidateSearch } from '@/components/recruiter/CandidateSearch';
import { getRecruiterAccountById } from '@/lib/auth/recruiter-accounts';
import { getRecruiterDailyOutreachCount, listOptInCandidates, listRecruiterOutreach } from '@/lib/jobs/candidate-outreach-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `Recruiter Dashboard | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function PipelineStat({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 font-bold text-2xl text-zinc-900 dark:text-zinc-50">{count}</p>
    </div>
  );
}

export default async function RecruiterDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/recruiter/sign-in?callbackUrl=/recruiter/dashboard');
  if (session.user.role !== 'recruiter') redirect('/');

  const [recruiter, candidates, outreach, dailyCount] = await Promise.all([
    getRecruiterAccountById(session.user.id),
    listOptInCandidates(session.user.id),
    listRecruiterOutreach(session.user.id),
    getRecruiterDailyOutreachCount(session.user.id),
  ]);
  const dailyRemaining = Math.max(0, 20 - dailyCount);

  const stats = {
    sent: outreach.filter((o) => o.status === 'pending').length,
    viewed: outreach.filter((o) => o.status === 'read').length,
    accepted: outreach.filter((o) => o.status === 'accepted').length,
    declined: outreach.filter((o) => o.status === 'declined').length,
  };

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">
                Welcome, {recruiter?.name || session.user.email}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {recruiter?.agency ? `${recruiter.agency} · ` : ''}
                {session.user.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                href="/recruiter/jobs"
              >
                My jobs
              </Link>
              <Link
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                href="/recruiter/profile/edit"
              >
                Edit profile
              </Link>
              <SignOutButton />
            </div>
          </div>

          {/* Pipeline stats */}
          {outreach.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PipelineStat label="Sent" count={stats.sent} icon={<Clock className="h-3.5 w-3.5" />} />
              <PipelineStat label="Viewed" count={stats.viewed} icon={<UserCheck className="h-3.5 w-3.5" />} />
              <PipelineStat label="Accepted" count={stats.accepted} icon={<CheckCircle className="h-3.5 w-3.5" />} />
              <PipelineStat label="Declined" count={stats.declined} icon={<XCircle className="h-3.5 w-3.5" />} />
            </div>
          )}

          {/* Tabs */}
          <div className="mt-10">
            <div className="border-b border-zinc-200 dark:border-zinc-800">
              <nav className="-mb-px flex gap-6">
                <span className="border-b-2 border-primary pb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  <Users className="inline h-4 w-4 mr-1.5 -mt-0.5" aria-hidden />
                  Candidates ({candidates.length})
                </span>
                {outreach.length > 0 && (
                  <Link
                    className="border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    href="/recruiter/pipeline"
                  >
                    <Send className="inline h-4 w-4 mr-1.5 -mt-0.5" aria-hidden />
                    My outreach ({outreach.length})
                  </Link>
                )}
              </nav>
            </div>

            <div className="mt-6">
              <CandidateSearch initial={candidates} initialDailyRemaining={dailyRemaining} />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
