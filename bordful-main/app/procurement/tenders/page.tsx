import type { Metadata } from 'next';
import Link from 'next/link';
import { Search as SearchIcon, FileSearch } from 'lucide-react';
import { HeroSection } from '@/components/ui/hero-section';
import { TenderCard } from '@/components/procurement/TenderCard';
import { TenderFiltersSidebar } from '@/components/procurement/TenderFiltersSidebar';
import { TenderControls } from '@/components/procurement/TenderControls';
import {
  getTenderFacets,
  listActiveTenders,
  type TenderSort,
} from '@/lib/procurement/scraped-tender-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `Global Tenders | ${config.title}`,
  description: 'Browse public procurement tenders aggregated daily from TED (EU) and other sources.',
};

export const dynamic = 'force-dynamic';

type TendersSearchParams = {
  category?: string;
  source?: string;
  country?: string;
  q?: string;
  sort?: string;
  page?: string;
  perPage?: string;
};

export default async function ProcurementTendersPage({
  searchParams,
}: {
  searchParams: Promise<TendersSearchParams>;
}) {
  const sp = await searchParams;
  const categories = (sp.category ?? '').split(',').filter(Boolean);
  const sources = (sp.source ?? '').split(',').filter(Boolean);
  const countries = (sp.country ?? '').split(',').filter(Boolean);
  const query = sp.q ?? '';
  const sort: TenderSort = sp.sort === 'deadline' ? 'deadline' : 'newest';
  const page = Math.max(1, Number.parseInt(sp.page || '1', 10) || 1);
  const perPageParsed = Number.parseInt(sp.perPage || '20', 10);
  const perPage = [10, 20, 50].includes(perPageParsed) ? perPageParsed : 20;

  const [{ tenders, total }, facets] = await Promise.all([
    listActiveTenders({ categories, sources, countries, query, sort, page, perPage }),
    getTenderFacets(),
  ]);

  const totalActive = facets.sources.reduce((sum, s) => sum + s.count, 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const buildLink = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (sp.category) params.set('category', sp.category);
    if (sp.source) params.set('source', sp.source);
    if (sp.country) params.set('country', sp.country);
    if (sp.q) params.set('q', sp.q);
    if (sp.sort) params.set('sort', sp.sort);
    if (sp.perPage) params.set('perPage', sp.perPage);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const qs = params.toString();
    return qs ? `/procurement/tenders?${qs}` : '/procurement/tenders';
  };

  return (
    <main className="bg-background">
      <HeroSection
        badge="Global tenders"
        description={`Aggregated daily from TED (EU Tenders Electronic Daily) and PPRA (Pakistan). ${totalActive.toLocaleString()} tenders currently open.`}
        title={`${totalActive.toLocaleString()} open tenders worldwide`}
      >
        <form action="/procurement/tenders" className="flex max-w-md gap-2" method="GET">
          {sp.category && <input name="category" type="hidden" value={sp.category} />}
          {sp.source && <input name="source" type="hidden" value={sp.source} />}
          {sp.country && <input name="country" type="hidden" value={sp.country} />}
          {sp.sort && <input name="sort" type="hidden" value={sp.sort} />}
          <div className="relative flex-1">
            <SearchIcon
              aria-hidden="true"
              className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground"
            />
            <input
              className="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground"
              defaultValue={query}
              name="q"
              placeholder="Search tenders by keyword or buyer…"
              type="text"
            />
          </div>
          <button
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:opacity-90"
            type="submit"
          >
            Search
          </button>
        </form>
      </HeroSection>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:gap-8">
          <div className="order-2 flex-[3] md:order-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Showing {tenders.length.toLocaleString()} of {total.toLocaleString()} tenders
              </p>
              <TenderControls />
            </div>

            {tenders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
                  <FileSearch aria-hidden="true" className="h-5 w-5" />
                </div>
                <p className="mt-4 font-semibold">No tenders found</p>
                <p className="mt-1.5 text-muted-foreground text-sm">
                  Try different filters, or check back after the next daily scrape.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tenders.map((tender) => (
                  <TenderCard key={tender.id} tender={tender} />
                ))}
              </div>
            )}

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
          </div>

          <aside className="order-1 w-full md:order-2 md:w-[240px] lg:w-[260px]">
            <TenderFiltersSidebar facets={facets} />
          </aside>
        </div>
      </div>
    </main>
  );
}
