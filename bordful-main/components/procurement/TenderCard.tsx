import type { ScrapedTenderRow } from '@/lib/procurement/scraped-tender-actions';

export function TenderCard({ tender }: { tender: ScrapedTenderRow }) {
  return (
    <a
      className="block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
      href={tender.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">{tender.title}</p>
          {tender.buyerName && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{tender.buyerName}</p>
          )}
        </div>
        {tender.country && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-800">
            {tender.country}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
        {tender.publicationDate && <span>Published {tender.publicationDate}</span>}
        {tender.deadlineDate && (
          <span>Deadline {new Date(tender.deadlineDate).toLocaleDateString()}</span>
        )}
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 uppercase text-zinc-500 dark:bg-zinc-800">
          {tender.source}
        </span>
      </div>
    </a>
  );
}
