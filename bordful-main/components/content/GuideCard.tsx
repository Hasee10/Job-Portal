import { ArrowRight, Clock, BookOpen } from "lucide-react";
import Link from "next/link";
import { getGuideCategoryStyle } from "@/lib/constants/guide-categories";
import type { CareerGuide } from "@/lib/content/guide-actions";
import { estimateReadMinutes } from "@/lib/content/guide-content";

export function GuideCard({ guide }: { guide: CareerGuide }) {
  const readMinutes = estimateReadMinutes(guide.content);

  return (
    <Link
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/50"
      href={`/guides/${guide.slug}`}
    >
      <div className="flex items-center justify-between border-b bg-primary/5 px-6 py-7">
        <BookOpen
          size={28}
          className="text-[#086b85] dark:text-cyan-200"
          aria-hidden="true"
        />
        <span className="font-mono text-muted-foreground text-xs">
          JOBLO / FIELD NOTES
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          {guide.category && (
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 font-medium text-xs ${getGuideCategoryStyle(guide.category)}`}
            >
              {guide.category}
            </span>
          )}
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
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

        <span className="mt-auto inline-flex pt-5 items-center gap-1 font-medium text-cyan-700 text-sm dark:text-cyan-400">
          Read guide
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
