import type { ScrapedTenderRow } from '@/lib/procurement/scraped-tender-actions';
import { TENDER_CATEGORIES } from '@/lib/procurement/tender-categories';

const SOURCE_LABELS: Record<string, string> = {
  ted: 'TED',
  ppra: 'PPRA',
};

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  '72': 'bg-blue-50 border-blue-100 border text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400',
  '79': 'bg-amber-50 border-amber-100 border text-amber-700 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-400',
  '45': 'bg-zinc-100 border-zinc-200 border text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300',
};

function categoryLabel(cpvCodes: string[]): { prefix: string; label: string } | null {
  const match = TENDER_CATEGORIES.find((c) => cpvCodes.some((code) => code.startsWith(c.cpvPrefix)));
  if (!match) return null;
  return { prefix: match.cpvPrefix, label: match.label.split(' (')[0] };
}

function daysUntil(deadline: string): number {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// tender.url comes verbatim from an external, unauthenticated source (TED's
// API response / a scraped PPRA href) with no scheme validation before it's
// stored - rendering it as an <a href> unchecked would let a malicious
// notice (e.g. a `javascript:` URL) execute in a visitor's browser on click.
// Only ever render it as a live link once it's confirmed http(s).
function safeHref(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

function DeadlineChip({ deadlineDate }: { deadlineDate: string | null }) {
  if (!deadlineDate) return null;
  const days = daysUntil(deadlineDate);
  if (days < 0) return null;

  const label = days === 0 ? 'Closes today' : days === 1 ? '1 day left' : `${days} days left`;
  const className =
    days <= 7
      ? 'bg-red-50 border-red-100 border text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-400'
      : days <= 30
        ? 'bg-amber-50 border-amber-100 border text-amber-700 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-400'
        : 'bg-card border text-foreground';

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${className}`}>
      {label}
    </span>
  );
}

export function TenderCard({ tender }: { tender: ScrapedTenderRow }) {
  const category = categoryLabel(tender.cpvCodes);
  const href = safeHref(tender.url);

  return (
    <a
      className="block rounded-lg border p-4 transition-all hover:border-gray-400 sm:p-5 dark:hover:border-zinc-600 aria-disabled:pointer-events-none aria-disabled:opacity-60"
      aria-disabled={!href}
      href={href ?? '#'}
      rel="noopener noreferrer"
      target={href ? '_blank' : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="line-clamp-2 font-medium text-base">{tender.title}</h2>
        <DeadlineChip deadlineDate={tender.deadlineDate} />
      </div>

      <div className="mt-1 text-gray-600 text-sm dark:text-zinc-400">
        {[tender.buyerName, tender.country].filter(Boolean).join(' · ')}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {category && (
          <span className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_BADGE_CLASS[category.prefix] ?? 'bg-card border text-foreground'}`}>
            {category.label}
          </span>
        )}
        <span className="rounded-full border bg-card px-2 py-0.5 text-foreground text-xs">
          {SOURCE_LABELS[tender.source] ?? tender.source}
        </span>
        {tender.publicationDate && (
          <span className="text-gray-500 text-xs dark:text-zinc-400">
            Published {new Date(tender.publicationDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </a>
  );
}
