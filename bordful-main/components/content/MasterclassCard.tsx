import { Clock, Play } from 'lucide-react';
import Image from 'next/image';
import { getGuideCategoryStyle } from '@/lib/constants/guide-categories';
import type { Masterclass } from '@/lib/content/masterclass-actions';
import { getYouTubeThumbnailUrl } from '@/lib/content/masterclass-video';

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function MasterclassCard({
  masterclass,
  onPlay,
}: {
  masterclass: Masterclass;
  onPlay: () => void;
}) {
  const thumbnail = masterclass.videoUrl
    ? getYouTubeThumbnailUrl(masterclass.videoUrl)
    : null;
  const duration = formatDuration(masterclass.durationMinutes);

  return (
    <button
      className="group block w-full overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_8px_30px_rgba(0,0,0,0.4)]"
      onClick={onPlay}
      type="button"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {thumbnail && (
          <Image
            alt=""
            className="object-cover transition-transform group-hover:scale-105"
            fill
            src={thumbnail}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-md transition-transform group-hover:scale-110 dark:bg-zinc-950/90 dark:text-zinc-50">
            <Play aria-hidden="true" className="ml-0.5 h-4 w-4" fill="currentColor" />
          </div>
        </div>
        {duration && (
          <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 font-medium text-white text-xs">
            {duration}
          </span>
        )}
      </div>

      <div className="p-4">
        {masterclass.category && (
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 font-medium text-xs ${getGuideCategoryStyle(masterclass.category)}`}
          >
            {masterclass.category}
          </span>
        )}
        <h2 className="mt-2 font-semibold text-base text-zinc-900 leading-snug transition-colors group-hover:text-cyan-700 dark:text-zinc-50 dark:group-hover:text-cyan-400">
          {masterclass.title}
        </h2>
        {(masterclass.instructorName || masterclass.instructorTitle) && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {[masterclass.instructorName, masterclass.instructorTitle]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {masterclass.description && (
          <p className="mt-2 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-500">
            {masterclass.description}
          </p>
        )}
        {!thumbnail && (
          <span className="mt-2 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
            <Clock aria-hidden="true" className="h-3 w-3" />
            Watch
          </span>
        )}
      </div>
    </button>
  );
}
