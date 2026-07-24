'use client';

import { useMemo, useState } from 'react';
import { GuideCard } from '@/components/content/GuideCard';
import type { CareerGuide } from '@/lib/content/guide-actions';

export function GuideLibrary({ guides }: { guides: CareerGuide[] }) {
  const categories = useMemo(() => {
    const unique = new Set(
      guides.map((guide) => guide.category).filter((c): c is string => Boolean(c))
    );
    return Array.from(unique);
  }, [guides]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredGuides = activeCategory
    ? guides.filter((guide) => guide.category === activeCategory)
    : guides;

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
            All guides
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGuides.map((guide) => (
          <GuideCard guide={guide} key={guide.id} />
        ))}
      </div>
    </div>
  );
}
