import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import { auth } from '@/auth';
import { EmployerInviteItem } from '@/components/seeker/EmployerInviteItem';
import { InboxItem } from '@/components/seeker/InboxItem';
import { OpenToRecruitersToggle } from '@/components/seeker/OpenToRecruitersToggle';
import { SeekerHeadlineForm } from '@/components/seeker/SeekerHeadlineForm';
import { listSeekerInbox } from '@/lib/jobs/candidate-outreach-actions';
import { listSeekerInvites } from '@/lib/jobs/employer-candidate-actions';
import { createClient } from '@supabase/supabase-js';
import config from '@/config';

type InboxEntry =
  | { kind: 'recruiter'; createdAt: string; status: string; item: Awaited<ReturnType<typeof listSeekerInbox>>[number] }
  | { kind: 'invite'; createdAt: string; status: string; item: Awaited<ReturnType<typeof listSeekerInvites>>[number] };

export const metadata: Metadata = {
  title: `Recruiter Inbox | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function getSeekerVisibility(seekerId: string): Promise<{ openToRecruiters: boolean; headline: string | null }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { openToRecruiters: false, headline: null };
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await supabase
    .from('job_seekers')
    .select('open_to_recruiters, headline')
    .eq('id', seekerId)
    .maybeSingle();
  return {
    openToRecruiters: Boolean(data?.open_to_recruiters),
    headline: (data?.headline as string) || null,
  };
}

export default async function SeekerInboxPage() {
  const session = await auth();
  if (!session?.user) redirect('/account/sign-in?callbackUrl=/account/inbox');
  if (session.user.role !== 'seeker') redirect('/account');

  const [inbox, invites, visibility] = await Promise.all([
    listSeekerInbox(session.user.id),
    listSeekerInvites(session.user.id),
    getSeekerVisibility(session.user.id),
  ]);
  const { openToRecruiters, headline } = visibility;

  const entries: InboxEntry[] = [
    ...inbox.map((item) => ({ kind: 'recruiter' as const, createdAt: item.createdAt, status: item.status, item })),
    ...invites.map((item) => ({ kind: 'invite' as const, createdAt: item.createdAt, status: item.status, item })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unread = entries.filter((e) => e.status === 'pending').length;

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">

          <Link
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            href="/account"
          >
            <ArrowLeft className="h-4 w-4" />
            My account
          </Link>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">
                Inbox
                {unread > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {unread}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Recruiters and employers who want to connect with you appear here.
              </p>
            </div>
          </div>

          {/* Visibility settings */}
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <OpenToRecruitersToggle initial={openToRecruiters} />
            {!openToRecruiters && (
              <p className="mt-2 text-xs text-zinc-400">
                Enable this to let recruiters discover your profile and send you outreach messages.
              </p>
            )}
            <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <SeekerHeadlineForm initial={headline} />
            </div>
          </div>

          {/* Inbox */}
          <div className="mt-6">
            {entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <Inbox className="h-5 w-5 text-zinc-400" />
                </div>
                <p className="mt-3 font-medium text-zinc-900 dark:text-zinc-50">No messages yet</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {openToRecruiters
                    ? 'Your profile is visible to recruiters and employers. Messages will appear here when they reach out.'
                    : 'Enable visibility above so recruiters and employers can find and message you.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) =>
                  entry.kind === 'recruiter' ? (
                    <InboxItem item={entry.item} key={`recruiter-${entry.item.id}`} />
                  ) : (
                    <EmployerInviteItem invite={entry.item} key={`invite-${entry.item.id}`} />
                  )
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
