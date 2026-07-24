import { ArrowLeft, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GuideCard } from '@/components/content/GuideCard';
import { GuideContent } from '@/components/content/GuideContent';
import { GuideTableOfContents } from '@/components/content/GuideTableOfContents';
import config from '@/config';
import { getGuideCategoryStyle } from '@/lib/constants/guide-categories';
import {
  estimateReadMinutes,
  extractGuideHeadings,
} from '@/lib/content/guide-content';
import {
  getPublishedGuideBySlug,
  listPublishedGuides,
} from '@/lib/content/guide-actions';

export const dynamic = 'force-dynamic';

const MAX_RELATED_GUIDES = 3;

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

  const headings = extractGuideHeadings(guide.content);
  const readMinutes = estimateReadMinutes(guide.content);

  const allGuides = await listPublishedGuides();
  const relatedGuides = allGuides
    .filter((g) => g.id !== guide.id && g.category === guide.category)
    .slice(0, MAX_RELATED_GUIDES);

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            href="/guides"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            All guides
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {guide.category && (
              <span
                className={`inline-block rounded-full border px-2.5 py-0.5 font-medium text-xs ${getGuideCategoryStyle(guide.category)}`}
              >
                {guide.category}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
              <Clock aria-hidden="true" className="h-3 w-3" />
              {readMinutes} min read
            </span>
          </div>

          <h1 className="mt-3 font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            {guide.title}
          </h1>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_220px]">
            <div className="min-w-0">
              <GuideContent content={guide.content} />
            </div>
            <GuideTableOfContents headings={headings} />
          </div>

          {relatedGuides.length > 0 && (
            <div className="mt-16 border-zinc-200 border-t pt-10 dark:border-zinc-800">
              <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                Related guides
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedGuides.map((related) => (
                  <GuideCard guide={related} key={related.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
