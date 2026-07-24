import type { GuideHeading } from '@/lib/content/guide-content';

export function GuideTableOfContents({ headings }: { headings: GuideHeading[] }) {
  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto lg:block"
    >
      <p className="font-semibold text-xs text-zinc-500 uppercase tracking-wide dark:text-zinc-500">
        On this page
      </p>
      <ul className="mt-3 space-y-2 border-zinc-200 border-l dark:border-zinc-800">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              className="block border-transparent border-l-2 py-0.5 pl-3 text-sm text-zinc-600 transition-colors hover:border-cyan-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-cyan-400 dark:hover:text-zinc-100"
              href={`#${heading.id}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
