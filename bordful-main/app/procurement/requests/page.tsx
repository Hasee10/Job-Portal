import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardList, Plus } from 'lucide-react';
import { auth } from '@/auth';
import { listBuyerRequests } from '@/lib/procurement/request-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `My Procurement Requests | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  closed_for_responses: 'Closed for responses',
  bids_opened: 'Bids opened',
  evaluating: 'Evaluating',
  awarded: 'Awarded',
  cancelled: 'Cancelled',
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800',
  published: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  closed_for_responses: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  bids_opened: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  evaluating: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  awarded: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  cancelled: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800',
};

export default async function ProcurementRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in?callbackUrl=/procurement/requests');
  if (session.user.role !== 'employer') redirect('/');

  const requests = await listBuyerRequests(session.user.id);

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">Procurement requests</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                RFIs, RFQs, RFPs, and tenders you've created.
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              href="/procurement/requests/new"
            >
              <Plus className="h-4 w-4" />
              New request
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <ClipboardList className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="mt-3 font-medium text-zinc-900 dark:text-zinc-50">No requests yet</p>
              <p className="mt-1 text-sm text-zinc-500">Create your first RFI, RFQ, RFP, or tender.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {requests.map((req) => (
                <Link
                  className="block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                  href={`/procurement/requests/${req.id}`}
                  key={req.id}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{req.title}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-800">
                          {req.type}
                        </span>
                        {req.sealedBids && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                            Sealed
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{req.category}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[req.status] ?? ''}`}
                    >
                      {STATUS_LABEL[req.status] ?? req.status}
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
