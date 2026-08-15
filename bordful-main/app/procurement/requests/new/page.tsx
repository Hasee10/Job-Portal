import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RequestForm } from '@/components/procurement/RequestForm';
import config from '@/config';

export const metadata: Metadata = {
  title: `New Procurement Request | ${config.title}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NewProcurementRequestPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in?callbackUrl=/procurement/requests/new');
  if (session.user.role !== 'employer') redirect('/');

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">New procurement request</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Starts as a draft — nothing is visible to vendors until you publish it.
          </p>
          <div className="mt-8">
            <RequestForm />
          </div>
        </div>
      </div>
    </main>
  );
}
