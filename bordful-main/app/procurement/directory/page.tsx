import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrganizationCard } from "@/components/procurement/OrganizationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import config from "@/config";
import {
  getDirectoryFacets,
  listPublicOrganizations,
  parseDirectoryFilters,
  DIRECTORY_PAGE_SIZE,
} from "@/lib/procurement/directory-actions";

export const metadata: Metadata = {
  description:
    "Find buyers and suppliers across the marketplace by category, region and capability.",
  title: `Business directory | ${config.title}`,
};

export const dynamic = "force-dynamic";

function pageHref(params: Record<string, string>, page: number): string {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/procurement/directory?${next.toString()}`;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseDirectoryFilters(sp);

  // Both reads are public-projection only - no membership or procurement
  // data is touched here, and the page is reachable signed out.
  const [result, facets] = await Promise.all([
    listPublicOrganizations(filters),
    getDirectoryFacets().catch(() => ({ categories: [], regions: [] })),
  ]);

  const activeParams: Record<string, string> = {};
  if (filters.q) {
    activeParams.q = filters.q;
  }
  if (filters.capability !== "all") {
    activeParams.capability = filters.capability;
  }
  if (filters.category) {
    activeParams.category = filters.category;
  }
  if (filters.region) {
    activeParams.region = filters.region;
  }

  const filterLabels = Object.entries(activeParams).map(([key, value]) => ({
    key,
    label:
      key === "capability"
        ? value === "buyer"
          ? "Buyers"
          : "Suppliers"
        : value,
  }));
  const removeFilterHref = (key: string) => {
    const params = new URLSearchParams(activeParams);
    params.delete(key);
    return `/procurement/directory${params.size ? `?${params}` : ""}`;
  };
  const firstResult = (filters.page - 1) * DIRECTORY_PAGE_SIZE + 1;
  return (
    <main className="min-h-[60vh] bg-muted/20 pb-16">
      <section className="border-b bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <Link
            href="/procurement"
            className="text-muted-foreground text-sm hover:underline"
          >
            Procurement / Business directory
          </Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-semibold text-[#086b85] text-xs uppercase tracking-widest dark:text-cyan-200">
                DISCOVER YOUR NEXT BUSINESS PARTNER
              </p>
              <h1 className="mt-3 font-semibold text-3xl tracking-tight sm:text-4xl">
                Business directory
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-relaxed">
                Find buyers and suppliers by capability, industry and region.
                Explore a business before starting a conversation.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/procurement/organizations">
                List your business{" "}
                <ArrowRight size={16} className="ml-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <div className="container mx-auto max-w-6xl px-4">
        <form
          action="/procurement/directory"
          method="get"
          className="mt-8 rounded-2xl border bg-card p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label
                htmlFor="business-search"
                className="mb-2 block font-medium text-sm"
              >
                Find a business
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-3 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="h-11 pl-10"
                  id="business-search"
                  name="q"
                  type="search"
                  defaultValue={filters.q}
                  placeholder="Business name, service or keyword"
                />
              </div>
            </div>
            <Button
              className="h-11 self-end bg-[#086b85] text-white hover:bg-[#07576d] max-sm:w-full"
              type="submit"
            >
              <Search size={16} className="mr-2" aria-hidden="true" />
              Search businesses
            </Button>
          </div>
          <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <SlidersHorizontal size={14} aria-hidden="true" />
                Business type
              </span>
              <select
                aria-label="Capability"
                name="capability"
                defaultValue={filters.capability}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="all">Buyers and suppliers</option>
                <option value="buyer">Buyers only</option>
                <option value="supplier">Suppliers only</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="block font-medium">Category</span>
              <select
                aria-label="Category"
                name="category"
                defaultValue={filters.category}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">All categories</option>
                {facets.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="block font-medium">Operating region</span>
              <select
                aria-label="Region"
                name="region"
                defaultValue={filters.region}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">All regions</option>
                {facets.regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
        {filterLabels.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-muted-foreground text-xs">
              Active filters
            </span>
            {filterLabels.map((filter) => (
              <Link
                key={filter.key}
                href={removeFilterHref(filter.key)}
                aria-label={`Remove ${filter.label} filter`}
                className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs"
              >
                {filter.label}
                <X size={12} aria-hidden="true" />
              </Link>
            ))}
            <Link
              className="ml-2 text-sm underline underline-offset-4"
              href="/procurement/directory"
            >
              Clear all
            </Link>
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-base">
            {result.total.toLocaleString()}{" "}
            {result.total === 1 ? "business" : "businesses"} found
          </h2>
          <span className="text-muted-foreground text-xs">
            {result.organizations.length
              ? `${firstResult}-${firstResult + result.organizations.length - 1} of ${result.total} · Name A-Z`
              : "No results on this page"}
          </span>
        </div>
        {result.organizations.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
            <Search
              className="mx-auto text-muted-foreground"
              size={28}
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold text-xl">
              No businesses on this page
            </h3>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm">
              Try a broader keyword or remove a filter to discover more
              businesses.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link href="/procurement/directory">
                Reset filters and view all
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.organizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                organization={organization}
              />
            ))}
          </div>
        )}
        {result.pageCount > 1 && (
          <nav
            aria-label="Directory pagination"
            className="mt-8 flex items-center justify-between gap-3 rounded-xl border bg-background p-4 text-sm"
          >
            {filters.page > 1 ? (
              <Link
                className="rounded-lg border px-3 py-2 hover:bg-muted"
                href={pageHref(activeParams, filters.page - 1)}
              >
                Previous
              </Link>
            ) : (
              <span className="text-muted-foreground text-xs">First page</span>
            )}
            <span className="text-muted-foreground">
              Page {filters.page} of {result.pageCount}
            </span>
            {filters.page < result.pageCount ? (
              <Link
                className="rounded-lg border px-3 py-2 hover:bg-muted"
                href={pageHref(activeParams, filters.page + 1)}
              >
                Next
              </Link>
            ) : (
              <span className="text-muted-foreground text-xs">Last page</span>
            )}
          </nav>
        )}
        <p className="mt-6 text-center text-muted-foreground text-xs leading-relaxed">
          Business information is self-declared. Review capabilities and
          credentials before entering into an agreement.
        </p>
      </div>
    </main>
  );
}
