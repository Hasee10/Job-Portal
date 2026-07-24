import type { Metadata } from 'next';
import { GuideLibrary } from '@/components/content/GuideLibrary';
import config from '@/config';
import { listPublishedGuides } from '@/lib/content/guide-actions';

export const metadata: Metadata = {
  title: `Career Guides | ${config.title}`,
  description: 'Practical guides to help you search, apply, and negotiate.',
};

export const dynamic = 'force-dynamic';

export default async function GuidesPage() {
  const guides = await listPublishedGuides();

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Career guides
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Practical, no-fluff advice on job searching, applications, and
            negotiation.
          </p>

          {guides.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium text-sm">
                Our guide library is launching soon.
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Check back shortly for practical guides on searching,
                applying, and negotiating.
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <GuideLibrary guides={guides} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
