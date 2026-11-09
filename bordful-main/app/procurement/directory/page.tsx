import { Search } from "lucide-react";
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

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Business directory
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Businesses that chose to list themselves publicly. Details are
            self-declared and are not verified by us.
          </p>

          <form
            action="/procurement/directory"
            className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            method="get"
          >
            <div className="lg:col-span-2">
              <Input
                aria-label="Search businesses"
                defaultValue={filters.q}
                name="q"
                placeholder="Search name, description or services"
                type="search"
              />
            </div>
            <select
              aria-label="Capability"
              className="h-9 rounded-md border border-zinc-200 bg-transparent px-3 text-sm dark:border-zinc-800"
              defaultValue={filters.capability}
              name="capability"
            >
              <option value="all">Buyers and suppliers</option>
              <option value="buyer">Buyers only</option>
              <option value="supplier">Suppliers only</option>
            </select>
            <select
              aria-label="Category"
              className="h-9 rounded-md border border-zinc-200 bg-transparent px-3 text-sm dark:border-zinc-800"
              defaultValue={filters.category}
              name="category"
            >
              <option value="">All categories</option>
              {facets.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              aria-label="Region"
              className="h-9 rounded-md border border-zinc-200 bg-transparent px-3 text-sm dark:border-zinc-800"
              defaultValue={filters.region}
              name="region"
            >
              <option value="">All regions</option>
              {facets.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <Button className="sm:col-span-2 lg:col-span-1" type="submit">
              <Search aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Search
            </Button>
          </form>

          <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
            {result.total === 0
              ? "No businesses match these filters."
              : `${result.total} ${result.total === 1 ? "business" : "businesses"} found`}
          </p>

          {result.organizations.length === 0 ? (
            <div className="mt-6 rounded-xl border border-zinc-200 border-dashed p-10 text-center dark:border-zinc-800">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                Nothing to show yet
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                Try removing a filter. If you run a business, you can list it
                from{" "}
                <Link
                  className="text-primary hover:underline"
                  href="/procurement/organizations"
                >
                  your organizations
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              className="mt-10 flex items-center justify-between text-sm"
            >
              {filters.page > 1 ? (
                <Link
                  className="text-primary hover:underline"
                  href={pageHref(activeParams, filters.page - 1)}
                >
                  &larr; Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-zinc-600 dark:text-zinc-400">
                Page {filters.page} of {result.pageCount}
              </span>
              {filters.page < result.pageCount ? (
                <Link
                  className="text-primary hover:underline"
                  href={pageHref(activeParams, filters.page + 1)}
                >
                  Next &rarr;
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}
