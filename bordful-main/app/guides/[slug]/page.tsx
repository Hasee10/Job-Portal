import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import config from '@/config';
import { getPublishedGuideBySlug } from '@/lib/content/guide-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) {
    return { title: `Career Guides | ${config.title}` };
  }
  return {
    title: `${guide.title} | ${config.title}`,
    description: guide.summary ?? undefined,
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) {
    notFound();
  }

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <Link
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            href="/guides"
          >
            &larr; All guides
          </Link>
          <h1 className="mt-4 font-bold text-2xl">{guide.title}</h1>
          {guide.category && (
            <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
              {guide.category}
            </span>
          )}
          <div className="prose prose-zinc dark:prose-invert mt-6 max-w-none whitespace-pre-wrap text-sm">
            {guide.content}
          </div>
        </div>
      </div>
    </main>
  );
}
