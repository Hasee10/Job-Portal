import type { Metadata } from 'next';
import { MasterclassGrid } from '@/components/content/MasterclassGrid';
import config from '@/config';
import { listPublishedMasterclasses } from '@/lib/content/masterclass-actions';

export const metadata: Metadata = {
  title: `MasterClasses | ${config.title}`,
  description:
    'Video sessions with hiring experts on job searching and interviewing.',
};

export const dynamic = 'force-dynamic';

export default async function MasterclassesPage() {
  const masterclasses = await listPublishedMasterclasses();

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            MasterClasses
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Video sessions with hiring experts on job searching and
            interviewing.
          </p>

          {masterclasses.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium text-sm">
                MasterClasses are launching soon.
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                We&apos;re lining up sessions with hiring experts - check
                back soon.
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <MasterclassGrid masterclasses={masterclasses} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
