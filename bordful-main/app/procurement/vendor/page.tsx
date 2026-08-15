import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { auth } from '@/auth';
import { resolveVendorId } from '@/lib/procurement/vendor-actions';
import { listVendorInvitations } from '@/lib/procurement/invitation-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `Vendor Invitations | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  invited: 'Invited',
  prequalification_pending: 'Prequalification pending',
  prequalification_approved: 'Prequalified — you can respond',
  prequalification_rejected: 'Not prequalified',
  viewed: 'Viewed',
  responded: 'Responded',
  declined: 'Declined',
};

export default async function ProcurementVendorInboxPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in?callbackUrl=/procurement/vendor');
  if (session.user.role !== 'recruiter') redirect('/');

  const vendorId = await resolveVendorId(session);
  const invitations = vendorId ? await listVendorInvitations(vendorId) : [];

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">Procurement invitations</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Requests employers have invited you to respond to.
          </p>

          {invitations.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Inbox className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="mt-3 font-medium text-zinc-900 dark:text-zinc-50">No invitations yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                When an employer invites you to a procurement request, it'll show up here.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {invitations.map((inv) => (
                <Link
                  className="block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                  href={`/procurement/vendor/requests/${inv.requestId}`}
                  key={inv.id}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{inv.requestTitle}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-800">
                          {inv.requestType}
                        </span>
                      </div>
                      {inv.responseDeadline && (
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          Deadline {new Date(inv.responseDeadline).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
