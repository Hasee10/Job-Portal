import { ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { estimateReadMinutes } from '@/lib/content/guide-content';
import { getGuideCategoryStyle } from '@/lib/constants/guide-categories';
import type { CareerGuide } from '@/lib/content/guide-actions';

export function GuideCard({ guide }: { guide: CareerGuide }) {
  const readMinutes = estimateReadMinutes(guide.content);

  return (
    <Link
      className="group block rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_8px_30px_rgba(0,0,0,0.4)]"
      href={`/guides/${guide.slug}`}
    >
      <div className="flex items-center justify-between gap-3">
        {guide.category && (
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 font-medium text-xs ${getGuideCategoryStyle(guide.category)}`}
          >
            {guide.category}
          </span>
        )}
        <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
          <Clock aria-hidden="true" className="h-3 w-3" />
          {readMinutes} min read
        </span>
      </div>

      <h2 className="mt-3 font-semibold text-lg text-zinc-900 leading-snug transition-colors group-hover:text-cyan-700 dark:text-zinc-50 dark:group-hover:text-cyan-400">
        {guide.title}
      </h2>

      {guide.summary && (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {guide.summary}
        </p>
      )}

      <span className="mt-4 inline-flex items-center gap-1 font-medium text-cyan-700 text-sm opacity-0 transition-opacity group-hover:opacity-100 dark:text-cyan-400">
        Read guide
        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
