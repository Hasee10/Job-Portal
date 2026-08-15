import type { Metadata } from 'next';
import Link from 'next/link';
import { FileSearch } from 'lucide-react';
import { listActiveTenders, listTenderCountries } from '@/lib/procurement/scraped-tender-actions';
import { TENDER_CATEGORIES } from '@/lib/procurement/tender-categories';
import { TenderCard } from '@/components/procurement/TenderCard';
import config from '@/config';

export const metadata: Metadata = {
  title: `Global Tenders | ${config.title}`,
  description: 'Browse public procurement tenders aggregated daily from TED (EU) and other sources.',
};

export const dynamic = 'force-dynamic';

const PER_PAGE = 20;

export default async function ProcurementTendersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; country?: string; page?: string }>;
}) {
  const { category, country, page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1);

  const [{ tenders, total }, countries] = await Promise.all([
    listActiveTenders({ cpvPrefix: category, country, page, perPage: PER_PAGE }),
    listTenderCountries(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const buildLink = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (country) params.set('country', country);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const qs = params.toString();
    return qs ? `/procurement/tenders?${qs}` : '/procurement/tenders';
  };

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Global tenders
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Public procurement notices aggregated daily. Currently sourced from TED (EU Tenders
            Electronic Daily).
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                !category
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
              }`}
              href={buildLink({ category: undefined, page: undefined })}
            >
              All categories
            </Link>
            {TENDER_CATEGORIES.map((c) => (
              <Link
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  category === c.cpvPrefix
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                }`}
                href={buildLink({ category: c.cpvPrefix, page: undefined })}
                key={c.cpvPrefix}
              >
                {c.label}
              </Link>
            ))}
          </div>

          {countries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  !country
                    ? 'border-primary text-primary'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                }`}
                href={buildLink({ country: undefined, page: undefined })}
              >
                All countries
              </Link>
              {countries.map((c) => (
                <Link
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    country === c
                      ? 'border-primary text-primary'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                  }`}
                  href={buildLink({ country: c, page: undefined })}
                  key={c}
                >
                  {c}
                </Link>
              ))}
            </div>
          )}

          {tenders.length === 0 ? (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-zinc-200 border-dashed bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
                <FileSearch aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">No tenders found</p>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                Try a different category or country, or check back after the next daily scrape.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-6 text-muted-foreground text-sm">
                {total.toLocaleString()} open tender{total === 1 ? '' : 's'}
              </p>
              <div className="mt-3 space-y-3">
                {tenders.map((tender) => (
                  <TenderCard key={tender.id} tender={tender} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between text-sm">
                  {page > 1 ? (
                    <Link className="text-primary hover:underline" href={buildLink({ page: String(page - 1) })}>
                      &larr; Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link className="text-primary hover:underline" href={buildLink({ page: String(page + 1) })}>
                      Next &rarr;
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
