import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { resolveVendorId } from '@/lib/procurement/vendor-actions';
import { getRequestById } from '@/lib/procurement/request-actions';
import { getVendorInvitation, markInvitationViewed } from '@/lib/procurement/invitation-actions';
import { getMyResponse } from '@/lib/procurement/response-actions';
import { RespondForm } from '@/components/procurement/RespondForm';
import { DeclineInvitationButton } from '@/components/procurement/DeclineInvitationButton';
import config from '@/config';

export const metadata: Metadata = {
  title: `Procurement Invitation | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const RESPONDABLE_STATUSES = ['invited', 'viewed', 'prequalification_approved'];

export default async function ProcurementVendorRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in?callbackUrl=/procurement/vendor');
  if (session.user.role !== 'recruiter') redirect('/');

  const vendorId = await resolveVendorId(session);
  if (!vendorId) redirect('/');

  const { id } = await params;
  const request = await getRequestById(id);
  if (!request) notFound();

  const invitation = await getVendorInvitation(vendorId, id);
  if (request.visibility === 'invite_only' && !invitation) notFound();
  if (invitation) await markInvitationViewed(vendorId, id);

  const myResponse = await getMyResponse(vendorId, id);
  const canRespond = !invitation || RESPONDABLE_STATUSES.includes(invitation.status);

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-xl text-zinc-900 dark:text-zinc-50">{request.title}</h1>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-800">
                {request.type}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{request.category}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {request.description}
            </p>
            {request.responseDeadline && (
              <p className="mt-3 text-muted-foreground text-xs">
                Deadline: {new Date(request.responseDeadline).toLocaleString()}
              </p>
            )}
          </div>

          {invitation?.status === 'prequalification_pending' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              Your prequalification is pending buyer approval. You'll be able to respond once approved.
            </div>
          )}
          {invitation?.status === 'prequalification_rejected' && (
            <div className="rounded-xl border border-zinc-200 bg-muted/40 p-4 text-sm dark:border-zinc-800">
              Your prequalification for this request was not approved.
            </div>
          )}
          {invitation?.status === 'declined' && (
            <div className="rounded-xl border border-zinc-200 bg-muted/40 p-4 text-sm dark:border-zinc-800">
              You declined this invitation.
            </div>
          )}

          {canRespond && (
            <>
              <RespondForm existingResponse={myResponse} request={request} />
              {invitation && !myResponse && <DeclineInvitationButton requestId={id} />}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
