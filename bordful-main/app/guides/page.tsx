import type { Metadata } from 'next';
import Link from 'next/link';
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
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl">Career guides</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
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
            <ul className="mt-8 space-y-4">
              {guides.map((guide) => (
                <li className="rounded-lg border p-6" key={guide.id}>
                  <Link
                    className="font-semibold text-lg hover:underline"
                    href={`/guides/${guide.slug}`}
                  >
                    {guide.title}
                  </Link>
                  {guide.category && (
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                      {guide.category}
                    </span>
                  )}
                  {guide.summary && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {guide.summary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
