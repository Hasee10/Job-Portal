"use client";

import { formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PublicLanding } from "@/components/home/PublicLanding";
import { JobCard } from "@/components/jobs/JobCard";
import { SaveSearchButton } from "@/components/jobs/SaveSearchButton";
import { useSeekerJobState } from "@/components/jobs/SeekerJobStateContext";
import { HeroSection } from "@/components/ui/hero-section";
import {
  JobFilters,
  SALARY_SLIDER_MAX,
  SALARY_SLIDER_MIN,
} from "@/components/ui/job-filters";
import { JobSearchInput } from "@/components/ui/job-search-input";
import { JobsPerPageSelect } from "@/components/ui/jobs-per-page-select";
import { PaginationControl } from "@/components/ui/pagination-control";
import { PostJobBanner } from "@/components/ui/post-job-banner";
import { SortOrderSelect } from "@/components/ui/sort-order-select";
import config from "@/config";
import type { LanguageCode } from "@/lib/constants/languages";
import type { CareerLevel, Job } from "@/lib/db/jobs";
import { normalizeAnnualSalary } from "@/lib/db/jobs";
import { useJobSearch } from "@/lib/hooks/useJobSearch";
import { usePagination } from "@/lib/hooks/usePagination";
import { useSortOrder } from "@/lib/hooks/useSortOrder";
import { filterJobsBySearch } from "@/lib/utils/filter-jobs";

type Filters = {
  types: string[];
  roles: CareerLevel[];
  remote: boolean;
  salaryMin: number;
  salaryMax: number;
  visa: boolean;
  languages: LanguageCode[];
  companies: string[];
};

type FilterType =
  | "type"
  | "role"
  | "remote"
  | "salary"
  | "visa"
  | "language"
  | "company"
  | "clear";
type FilterValue =
  | string[]
  | boolean
  | CareerLevel[]
  | LanguageCode[]
  | number[]
  | true;

type JobViewTab = "all" | "bookmarked" | "applied" | "not_interested";

const JOB_VIEW_TABS: { value: JobViewTab; label: string }[] = [
  { label: "Recent", value: "all" },
  { label: "Bookmarked", value: "bookmarked" },
  { label: "Applied", value: "applied" },
  { label: "Not Interested", value: "not_interested" },
];

function HomePageContent({
  initialJobs,
  totalActiveJobs,
  companiesHiringCount: companiesHiringCountProp,
  jobsAddedToday: jobsAddedTodayProp,
  jobsThisWeek: jobsThisWeekProp,
  isSeeker,
  statsAvailable = true,
}: {
  initialJobs: Job[];
  totalActiveJobs: number;
  companiesHiringCount: number;
  jobsAddedToday: number;
  jobsThisWeek: number;
  isSeeker: boolean;
  statsAvailable?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { searchTerm } = useJobSearch();
  const { sortOrder } = useSortOrder();
  const { page, setPage } = usePagination();
  // savedJobIds/applications are still sourced from the client context (they
  // genuinely need a client fetch), but whether the tab UI exists in the DOM
  // at all is driven by the server-checked `isSeeker` prop, not this hook's
  // own session read - useSession() starts in a 'loading' state on first
  // client render (before its own fetch to /api/auth/session resolves),
  // which would otherwise cause the tabs to flash in for a guest on every
  // load before flipping back out.
  const { savedJobIds, applications } = useSeekerJobState();
  const [activeView, setActiveView] = useState<JobViewTab>("all");

  // Parse initial filters from URL
  const initialFilters = {
    companies: searchParams.get("companies")?.split(",").filter(Boolean) || [],
    languages: (searchParams.get("languages")?.split(",").filter(Boolean) ||
      []) as LanguageCode[],
    remote: searchParams.get("remote") === "true",
    roles: (searchParams.get("roles")?.split(",").filter(Boolean) ||
      []) as CareerLevel[],
    salaryMax: Number(searchParams.get("salary_max")) || SALARY_SLIDER_MAX,
    salaryMin: Number(searchParams.get("salary_min")) || SALARY_SLIDER_MIN,
    types: searchParams.get("types")?.split(",").filter(Boolean) || [],
    visa: searchParams.get("visa") === "true",
  };

  const [filters, setFilters] = useState<Filters>({
    companies: initialFilters?.companies || [],
    languages: initialFilters?.languages || ([] as LanguageCode[]),
    remote: initialFilters?.remote,
    roles: initialFilters?.roles || [],
    salaryMax: initialFilters?.salaryMax ?? SALARY_SLIDER_MAX,
    salaryMin: initialFilters?.salaryMin ?? SALARY_SLIDER_MIN,
    types: initialFilters?.types || [],
    visa: initialFilters?.visa,
  });
  const [pendingUrlUpdate, setPendingUrlUpdate] = useState<Record<
    string,
    string | null
  > | null>(null);

  // Get jobs per page from URL or default
  const jobsPerPage = Number.parseInt(searchParams.get("per_page") || "10", 10);

  // Update URL with new parameters
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setPendingUrlUpdate(updates);
  }, []);

  // Handle URL updates
  useEffect(() => {
    if (pendingUrlUpdate) {
      const params = new URLSearchParams(searchParams);

      Object.entries(pendingUrlUpdate).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.replace(`/?${params.toString()}`, { scroll: false });
      setPendingUrlUpdate(null);
    }
  }, [pendingUrlUpdate, router, searchParams]);

  // Update URL when filters change
  const updateFilterParams = useCallback(
    (newFilters: Filters) => {
      const updates: Record<string, string | null> = {
        companies: newFilters.companies.length
          ? newFilters.companies.join(",")
          : null,
        languages: newFilters.languages.length
          ? newFilters.languages.join(",")
          : null,
        page: "1", // Reset to first page when filters change
        remote: newFilters.remote ? "true" : null,
        roles: newFilters.roles.length ? newFilters.roles.join(",") : null,
        salary_max:
          newFilters.salaryMax < SALARY_SLIDER_MAX
            ? String(newFilters.salaryMax)
            : null,
        salary_min:
          newFilters.salaryMin > SALARY_SLIDER_MIN
            ? String(newFilters.salaryMin)
            : null,
        types: newFilters.types.length ? newFilters.types.join(",") : null,
        visa: newFilters.visa ? "true" : null,
      };

      updateParams(updates);
    },
    [updateParams]
  );

  const handleFilterChange = useCallback(
    (filterType: FilterType, value: FilterValue) => {
      if (filterType === "clear") {
        const clearedFilters = {
          companies: [],
          languages: [],
          remote: false,
          roles: [] as CareerLevel[],
          salaryMax: SALARY_SLIDER_MAX,
          salaryMin: SALARY_SLIDER_MIN,
          types: [],
          visa: false,
        };
        setFilters(clearedFilters);
        updateFilterParams(clearedFilters);
        return;
      }

      setFilters((prev) => {
        const newFilters = { ...prev };

        switch (filterType) {
          case "type":
            if (
              Array.isArray(value) &&
              JSON.stringify(value) !== JSON.stringify(prev.types)
            ) {
              newFilters.types = value as string[];
            } else {
              return prev;
            }
            break;
          case "role":
            if (
              Array.isArray(value) &&
              JSON.stringify(value) !== JSON.stringify(prev.roles)
            ) {
              newFilters.roles = value as CareerLevel[];
            } else {
              return prev;
            }
            break;
          case "remote":
            if (typeof value === "boolean" && value !== prev.remote) {
              newFilters.remote = value;
            } else {
              return prev;
            }
            break;
          case "salary":
            if (
              Array.isArray(value) &&
              value.length === 2 &&
              (value[0] !== prev.salaryMin || value[1] !== prev.salaryMax)
            ) {
              const [min, max] = value as number[];
              newFilters.salaryMin = min;
              newFilters.salaryMax = max;
            } else {
              return prev;
            }
            break;
          case "visa":
            if (typeof value === "boolean" && value !== prev.visa) {
              newFilters.visa = value;
            } else {
              return prev;
            }
            break;
          case "language":
            if (
              Array.isArray(value) &&
              JSON.stringify(value) !== JSON.stringify(prev.languages)
            ) {
              newFilters.languages = value as LanguageCode[];
            } else {
              return prev;
            }
            break;
          case "company":
            if (
              Array.isArray(value) &&
              JSON.stringify(value) !== JSON.stringify(prev.companies)
            ) {
              newFilters.companies = value as string[];
            } else {
              return prev;
            }
            break;
        }

        updateFilterParams(newFilters);
        return newFilters;
      });
    },
    [updateFilterParams]
  );

  // Sort and filter jobs
  const filteredJobs = useMemo(() => {
    let filtered = [...initialJobs];

    // Apply search filter using our utility function
    filtered = filterJobsBySearch(filtered, searchTerm || "");

    // Apply job type filter
    if (filters.types.length > 0) {
      filtered = filtered.filter((job) => filters.types.includes(job.type));
    }

    // Apply career level filter
    if (filters.roles.length > 0) {
      filtered = filtered.filter((job) => {
        if (!job.career_level) {
          return false;
        }
        return filters.roles.some((role) => job.career_level.includes(role));
      });
    }

    // Apply remote filter
    if (filters.remote) {
      filtered = filtered.filter((job) => job.workplace_type === "Remote");
    }

    // Apply visa sponsorship filter
    if (filters.visa) {
      filtered = filtered.filter((job) => job.visa_sponsorship === "Yes");
    }

    // Apply salary range filter
    if (
      filters.salaryMin > SALARY_SLIDER_MIN ||
      filters.salaryMax < SALARY_SLIDER_MAX
    ) {
      filtered = filtered.filter((job) => {
        if (!job.salary) {
          return false;
        }
        const annualSalary = normalizeAnnualSalary(job.salary);
        if (annualSalary === -1) {
          return false;
        }
        return (
          annualSalary >= filters.salaryMin &&
          (filters.salaryMax >= SALARY_SLIDER_MAX ||
            annualSalary <= filters.salaryMax)
        );
      });
    }

    // Apply language filter
    if (filters.languages.length > 0) {
      filtered = filtered.filter((job) => {
        if (!job.languages || job.languages.length === 0) {
          return false;
        }
        return filters.languages.some((lang) => job.languages.includes(lang));
      });
    }

    // Apply company filter
    if (filters.companies.length > 0) {
      filtered = filtered.filter((job) =>
        filters.companies.includes(job.company)
      );
    }

    return filtered;
  }, [initialJobs, searchTerm, sortOrder, filters]);

  // Sort jobs based on selected option and featured status
  const sortedJobs = useMemo(() => {
    // First sort by featured status, then by the selected sort option
    return [...filteredJobs].sort((a, b) => {
      // First compare by featured status
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }

      // Then apply the selected sort for jobs with the same featured status
      switch (sortOrder) {
        case "newest":
          return (
            new Date(b.posted_date).getTime() -
            new Date(a.posted_date).getTime()
          );
        case "oldest":
          return (
            new Date(a.posted_date).getTime() -
            new Date(b.posted_date).getTime()
          );
        case "salary": {
          const aSalary = normalizeAnnualSalary(a.salary);
          const bSalary = normalizeAnnualSalary(b.salary);
          // -1 means no salary data — push those jobs to the end
          if (aSalary === -1 && bSalary === -1) {
            return 0;
          }
          if (aSalary === -1) {
            return 1;
          }
          if (bSalary === -1) {
            return -1;
          }
          return bSalary - aSalary;
        }
        default:
          return 0;
      }
    });
  }, [filteredJobs, sortOrder]);

  // Jobs for the active tab. Bookmarked/Applied/Not Interested are
  // cross-cutting seeker state, so they're sourced from the full job list
  // rather than the current search/filter results - a saved job should
  // still show up under Bookmarked even if it no longer matches a filter.
  const tabJobs = useMemo(() => {
    switch (activeView) {
      case "bookmarked":
        return initialJobs.filter((job) => savedJobIds.has(job.id));
      case "applied":
        return initialJobs.filter((job) => applications[job.id] === "applied");
      case "not_interested":
        return initialJobs.filter(
          (job) => applications[job.id] === "not_interested"
        );
      default:
        return sortedJobs.filter(
          (job) => applications[job.id] !== "not_interested"
        );
    }
  }, [activeView, initialJobs, savedJobIds, applications, sortedJobs]);

  // Reset to page 1 whenever the active tab changes
  useEffect(() => {
    setPage(1);
  }, [activeView, setPage]);

  // Calculate pagination
  const startIndex = (page - 1) * jobsPerPage;
  const paginatedJobs = tabJobs.slice(startIndex, startIndex + jobsPerPage);

  // Get the most recent job's posted date (timestamp or null)
  const lastUpdatedTimestamp = useMemo(() => {
    if (initialJobs.length === 0) {
      return null;
    }

    const mostRecentDate = Math.max(
      ...initialJobs.map((job) => new Date(job.posted_date).getTime())
    );

    return mostRecentDate; // Return the timestamp
  }, [initialJobs]);

  // Global figures come from complete server-side statistics, never the
  // bounded preview of jobs delivered to this client.
  const jobsAddedToday = jobsAddedTodayProp;
  const jobsThisWeek = jobsThisWeekProp;
  const companiesHiringCount = companiesHiringCountProp;

  if (!isSeeker || !statsAvailable) {
    return <PublicLanding jobsUnavailable={!statsAvailable} />;
  }

  return (
    <main className="min-h-screen bg-background">
      <HeroSection
        badge={config.badge}
        description={config.description}
        title={config.title}
        // Will use the global config.ui.heroImage since we're not specifying a custom one
      >
        {/* Search Bar - Replace with our new component */}
        <div className="max-w-[480px]">
          <JobSearchInput jobs={initialJobs} />
        </div>

        {/* Browse all jobs CTA */}
        <div className="mt-3">
          <a
            className="inline-flex items-center gap-1.5 font-medium text-sm underline underline-offset-4 opacity-75 transition-opacity hover:opacity-100"
            href="#jobs-section"
            style={{ color: config.ui?.heroStatsColor || "inherit" }}
          >
            Browse all {totalActiveJobs.toLocaleString()} open positions ↓
          </a>
        </div>

        {/* Quick Stats - Reverted to original structure with color customization */}
        {(config.quickStats?.enabled ?? true) && (
          <div
            className="mt-6 grid max-w-[480px] grid-cols-3 gap-4 text-muted-foreground text-xs"
            // Apply base color here, specific elements might override
            style={{ color: config.ui.heroStatsColor || undefined }}
          >
            {/* Open Jobs */}
            {(config.quickStats?.sections?.openJobs?.enabled ?? true) && (
              <div>
                <div
                  className="font-medium text-foreground"
                  // Override title color if heroStatsColor is set
                  style={{
                    color:
                      config.ui.heroStatsColor ||
                      undefined /* Default: text-foreground */,
                  }}
                >
                  {config.quickStats?.sections?.openJobs?.title || "Open Jobs"}
                </div>
                <div className="flex items-center">
                  {(config.quickStats?.sections?.openJobs
                    ?.showNewJobsIndicator ??
                    true) &&
                    jobsAddedToday > 0 && (
                      <span className="pulse-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    )}
                  <span /* Value inherits color from parent div */>
                    {totalActiveJobs.toLocaleString()}
                  </span>
                  {(config.quickStats?.sections?.openJobs
                    ?.showNewJobsIndicator ??
                    true) &&
                    jobsAddedToday > 0 && (
                      <span
                        className="ml-1"
                        /* Added today text inherits color */
                      >
                        ({jobsAddedToday.toLocaleString()} added today)
                      </span>
                    )}
                </div>
              </div>
            )}

            {/* Last Updated */}
            {(config.quickStats?.sections?.lastUpdated?.enabled ?? true) &&
              lastUpdatedTimestamp && ( // Ensure timestamp exists
                <div>
                  <div
                    className="font-medium text-foreground"
                    style={{
                      color:
                        config.ui.heroStatsColor ||
                        undefined /* Default: text-foreground */,
                    }}
                  >
                    {config.quickStats?.sections?.lastUpdated?.title ||
                      "Last Updated"}
                  </div>
                  <div /* Value inherits color */>
                    {formatDistanceToNow(new Date(lastUpdatedTimestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              )}

            {/* Trending Companies */}
            {(config.quickStats?.sections?.trending?.enabled ?? true) && (
              <div>
                <div
                  className="font-medium text-foreground"
                  style={{
                    color:
                      config.ui.heroStatsColor ||
                      undefined /* Default: text-foreground */,
                  }}
                >
                  {config.quickStats?.sections?.trending?.title || "Trending"}
                </div>
                <div /* Value inherits color */>
                  {Array.from(new Set(initialJobs.map((job) => job.company)))
                    .slice(
                      0,
                      config.quickStats?.sections?.trending?.maxCompanies || 3
                    )
                    .join(", ")}
                </div>
              </div>
            )}
          </div>
        )}
      </HeroSection>

      {/* Activity Bar */}
      <div className="border-b bg-muted/40" id="jobs-section">
        <div className="container mx-auto flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 text-muted-foreground text-xs">
          <span>
            <span className="font-semibold text-foreground">
              {jobsAddedToday.toLocaleString()}
            </span>{" "}
            added today
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            <span className="font-semibold text-foreground">
              {jobsThisWeek.toLocaleString()}
            </span>{" "}
            this week
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            <span className="font-semibold text-foreground">
              {companiesHiringCount.toLocaleString()}
            </span>{" "}
            companies hiring
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            <span className="font-semibold text-foreground">
              {totalActiveJobs.toLocaleString()}
            </span>{" "}
            open positions
          </span>
        </div>
      </div>

      {/* Jobs Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="order-2 flex-[3] md:order-1">
            {/* Job View Tabs - Bookmarked/Applied/Not Interested only exist
                in the DOM for a signed-in seeker. A guest gets a plain
                "Recent" label, not a tablist that redirects on click - those
                tabs have no meaning without an account, so they shouldn't be
                markup a guest's browser ever receives. */}
            <div className="mb-4 flex items-center justify-between gap-2 border-b">
              {isSeeker ? (
                <div
                  aria-label="Job view"
                  className="flex gap-1 overflow-x-auto"
                  role="tablist"
                >
                  {JOB_VIEW_TABS.map((tab) => (
                    <button
                      aria-selected={activeView === tab.value}
                      className={`whitespace-nowrap border-b-2 px-3 py-2 font-medium text-sm transition-colors ${
                        activeView === tab.value
                          ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                      key={tab.value}
                      onClick={() => setActiveView(tab.value)}
                      role="tab"
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="whitespace-nowrap border-zinc-900 border-b-2 px-3 py-2 font-medium text-sm text-zinc-900 dark:border-zinc-100 dark:text-zinc-100">
                  Recent
                </div>
              )}
              {activeView === "all" && (
                <div className="pb-2">
                  <SaveSearchButton
                    filters={filters}
                    isSeeker={isSeeker}
                    searchTerm={searchTerm || ""}
                  />
                </div>
              )}
            </div>

            {/* Easy Filter Pills */}
            {activeView === "all" && (
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  {
                    active: filters.remote,
                    label: "Remote",
                    onClick: () =>
                      handleFilterChange("remote", !filters.remote),
                  },
                  {
                    active: filters.types.includes("FullTime"),
                    label: "Full-time",
                    onClick: () =>
                      handleFilterChange(
                        "type",
                        filters.types.includes("FullTime")
                          ? filters.types.filter((t) => t !== "FullTime")
                          : [...filters.types, "FullTime"]
                      ),
                  },
                  {
                    active: filters.types.includes("Contract"),
                    label: "Contract",
                    onClick: () =>
                      handleFilterChange(
                        "type",
                        filters.types.includes("Contract")
                          ? filters.types.filter((t) => t !== "Contract")
                          : [...filters.types, "Contract"]
                      ),
                  },
                  {
                    active: filters.types.includes("PartTime"),
                    label: "Part-time",
                    onClick: () =>
                      handleFilterChange(
                        "type",
                        filters.types.includes("PartTime")
                          ? filters.types.filter((t) => t !== "PartTime")
                          : [...filters.types, "PartTime"]
                      ),
                  },
                  {
                    active: filters.salaryMin >= 100_000,
                    label: "$100K+",
                    onClick: () =>
                      handleFilterChange(
                        "salary",
                        filters.salaryMin >= 100_000
                          ? [SALARY_SLIDER_MIN, SALARY_SLIDER_MAX]
                          : [100_000, SALARY_SLIDER_MAX]
                      ),
                  },
                  {
                    active: filters.visa,
                    label: "Visa Sponsor",
                    onClick: () => handleFilterChange("visa", !filters.visa),
                  },
                ].map(({ label, active, onClick }) => (
                  <button
                    className={`rounded-full border px-3 py-1 font-medium text-xs transition-colors ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-background text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                    }`}
                    key={label}
                    onClick={onClick}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-0">
              <div className="w-full space-y-1 sm:w-auto">
                <h2 className="flex flex-wrap items-center gap-2 font-semibold text-xl tracking-tight">
                  {JOB_VIEW_TABS.find((t) => t.value === activeView)?.label ??
                    "Latest Opportunities"}
                  {page > 1 && (
                    <span className="font-normal text-gray-500 dark:text-muted-foreground">
                      Page {page}
                    </span>
                  )}
                </h2>
                <p className="text-muted-foreground text-sm">
                  Showing {paginatedJobs.length.toLocaleString()} of{" "}
                  {tabJobs.length.toLocaleString()} positions
                </p>
              </div>
              {activeView === "all" && (
                <div className="flex w-full items-center justify-between gap-3 overflow-x-auto pb-1 sm:w-auto sm:justify-end">
                  <JobsPerPageSelect />
                  <SortOrderSelect />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {paginatedJobs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    {activeView === "bookmarked" &&
                      "Nothing saved yet - bookmark a listing and it'll show up here."}
                    {activeView === "applied" &&
                      "You haven't marked any jobs as applied yet."}
                    {activeView === "not_interested" &&
                      "You haven't dismissed any jobs yet."}
                    {activeView === "all" &&
                      "No positions found matching your search criteria. Try adjusting your search terms."}
                  </p>
                </div>
              ) : (
                paginatedJobs.map((job) => <JobCard job={job} key={job.id} />)
              )}
            </div>

            {/* Pagination with optimized range */}
            {tabJobs.length > jobsPerPage && (
              <PaginationControl
                itemsPerPage={jobsPerPage}
                totalItems={tabJobs.length}
              />
            )}

            {/* Post Job Banner - Mobile only */}
            <div className="mt-8 md:hidden">
              <PostJobBanner />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="order-1 w-full md:order-2 md:w-[240px] lg:w-[250px] xl:w-[260px]">
            <div className="space-y-6">
              <JobFilters
                initialFilters={initialFilters}
                jobs={initialJobs}
                onFilterChange={handleFilterChange}
              />
              {/* Job Alerts Card */}
              <div className="rounded-lg border bg-muted p-5">
                <h3 className="font-semibold text-sm">Get job alerts</h3>
                <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                  Be the first to know when new roles matching your interests
                  are posted.
                </p>
                <a
                  className="mt-3 flex w-full items-center justify-center rounded-md border border-zinc-300 bg-background px-3 py-2 font-semibold text-foreground text-xs transition-colors hover:bg-accent hover:text-accent-foreground dark:border-zinc-600"
                  href="/job-alerts"
                >
                  Set up alerts →
                </a>
              </div>
              {/* Post Job Banner - Desktop only */}
              <div className="hidden md:block">
                <PostJobBanner />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function HomePage({
  initialJobs,
  totalActiveJobs,
  companiesHiringCount,
  jobsAddedToday,
  jobsThisWeek,
  isSeeker,
  statsAvailable = true,
}: {
  initialJobs: Job[];
  totalActiveJobs: number;
  companiesHiringCount: number;
  jobsAddedToday: number;
  jobsThisWeek: number;
  isSeeker: boolean;
  statsAvailable?: boolean;
}) {
  return (
    <Suspense>
      <HomePageContent
        statsAvailable={statsAvailable}
        companiesHiringCount={companiesHiringCount}
        initialJobs={initialJobs}
        isSeeker={isSeeker}
        jobsAddedToday={jobsAddedToday}
        jobsThisWeek={jobsThisWeek}
        totalActiveJobs={totalActiveJobs}
      />
    </Suspense>
  );
}
