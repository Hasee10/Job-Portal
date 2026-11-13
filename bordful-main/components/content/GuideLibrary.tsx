"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { GuideCard } from "@/components/content/GuideCard";
import type { CareerGuide } from "@/lib/content/guide-actions";

export function GuideLibrary({ guides }: { guides: CareerGuide[] }) {
  const categories = useMemo(() => {
    const unique = new Set(
      guides
        .map((guide) => guide.category)
        .filter((c): c is string => Boolean(c))
    );
    return Array.from(unique);
  }, [guides]);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredGuides = guides.filter(
    (guide) =>
      (!activeCategory || guide.category === activeCategory) &&
      `${guide.title} ${guide.summary ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  );

  return (
    <div>
      <label className="relative mb-5 block max-w-xl">
        <span className="sr-only">Search career guides</span>
        <Search
          size={17}
          className="absolute left-4 top-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search resumes, interviews, job search..."
          className="h-11 w-full rounded-xl border bg-background pl-11 pr-4 text-sm"
        />
      </label>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-3 py-1.5 font-medium text-sm transition-colors ${
              activeCategory === null
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
            }`}
            aria-pressed={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            type="button"
          >
            All guides
          </button>
          {categories.map((category) => (
            <button
              className={`rounded-full border px-3 py-1.5 font-medium text-sm transition-colors ${
                activeCategory === category
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
              }`}
              aria-pressed={activeCategory === category}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <p role="status" className="mt-5 text-muted-foreground text-xs">
        {filteredGuides.length}{" "}
        {filteredGuides.length === 1 ? "guide" : "guides"} to explore
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filteredGuides.map((guide) => (
          <GuideCard guide={guide} key={guide.id} />
        ))}
      </div>
      {filteredGuides.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed p-10 text-center">
          <h3 className="font-semibold">No guides match your search</h3>
          <p className="mt-2 text-muted-foreground text-sm">
            Try a different keyword or explore all topics.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory(null);
            }}
            className="mt-4 rounded-lg border bg-background px-4 py-2 text-sm"
          >
            Reset search
          </button>
        </div>
      )}
    </div>
  );
}
