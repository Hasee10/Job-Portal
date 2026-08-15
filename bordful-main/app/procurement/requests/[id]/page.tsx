import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getRequestForBuyer } from '@/lib/procurement/request-actions';
import { RequestDetail } from '@/components/procurement/RequestDetail';
import config from '@/config';

export const metadata: Metadata = {
  title: `Procurement Request | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ProcurementRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in?callbackUrl=/procurement/requests');
  if (session.user.role !== 'employer') redirect('/');

  const { id } = await params;
  const request = await getRequestForBuyer(session.user.id, id);
  if (!request) notFound();

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <RequestDetail initialRequest={request} />
        </div>
      </div>
    </main>
  );
}
