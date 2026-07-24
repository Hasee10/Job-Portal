'use client';

import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MasterclassCard } from '@/components/content/MasterclassCard';
import type { Masterclass } from '@/lib/content/masterclass-actions';
import { getYouTubeEmbedUrl } from '@/lib/content/masterclass-video';

export function MasterclassGrid({ masterclasses }: { masterclasses: Masterclass[] }) {
  const categories = useMemo(() => {
    const unique = new Set(
      masterclasses
        .map((mc) => mc.category)
        .filter((c): c is string => Boolean(c))
    );
    return Array.from(unique);
  }, [masterclasses]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Masterclass | null>(null);

  const filtered = activeCategory
    ? masterclasses.filter((mc) => mc.category === activeCategory)
    : masterclasses;

  const embedUrl = playing?.videoUrl ? getYouTubeEmbedUrl(playing.videoUrl) : null;

  return (
    <div>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-3 py-1.5 font-medium text-sm transition-colors ${
              activeCategory === null
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500'
            }`}
            onClick={() => setActiveCategory(null)}
            type="button"
          >
            All sessions
          </button>
          {categories.map((category) => (
            <button
              className={`rounded-full border px-3 py-1.5 font-medium text-sm transition-colors ${
                activeCategory === category
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500'
              }`}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((masterclass) => (
          <MasterclassCard
            key={masterclass.id}
            masterclass={masterclass}
            onPlay={() => setPlaying(masterclass)}
          />
        ))}
      </div>

      {playing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <p className="line-clamp-1 pr-4 font-medium text-sm text-white">
                {playing.title}
              </p>
              <button
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-white hover:bg-white/10"
                onClick={() => setPlaying(null)}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {embedUrl ? (
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                  src={embedUrl}
                  title={playing.title}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-400">
                  {playing.videoUrl ? (
                    <a
                      className="underline"
                      href={playing.videoUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Watch on the original source
                    </a>
                  ) : (
                    'No video available for this session.'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
