'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { JobListings } from '@/components/jobs/JobListings';
import { ClientBreadcrumb } from '@/components/ui/client-breadcrumb';
import {
  JobFilters,
  SALARY_SLIDER_MAX,
  SALARY_SLIDER_MIN,
} from '@/components/ui/job-filters';
import { JobsPerPageSelect } from '@/components/ui/jobs-per-page-select';
import { PaginationControl } from '@/components/ui/pagination-control';
import { PostJobBanner } from '@/components/ui/post-job-banner';
import { SortOrderSelect } from '@/components/ui/sort-order-select';
import type { JobType } from '@/lib/constants/job-types';
import type { LanguageCode } from '@/lib/constants/languages';
import { normalizeAnnualSalary, type CareerLevel, type Job } from '@/lib/db/airtable';
import { useJobSearch } from '@/lib/hooks/useJobSearch';
import { usePagination } from '@/lib/hooks/usePagination';
import { useSortOrder } from '@/lib/hooks/useSortOrder';
import { filterJobsBySearch } from '@/lib/utils/filter-jobs';

type JobsLayoutProps = {
  filteredJobs: Job[];
};

export function JobsLayout({ filteredJobs }: JobsLayoutProps) {
  const searchParams = useSearchParams();
  const { sortOrder } = useSortOrder();
  const { page } = usePagination();
  const { searchTerm } = useJobSearch();

  // Filter state
  const [selectedJobs, setSelectedJobs] = useState<Job[]>(filteredJobs);

  // Get URL params or defaults
  const jobsPerPage = Number(searchParams.get('per_page')) || 10;

  // Handle filter changes
  const handleFilterChange = useCallback(
    (
      filterType:
        | 'type'
        | 'role'
        | 'remote'
        | 'salary'
        | 'visa'
        | 'language'
        | 'company'
        | 'clear',
      value:
        | string[]
        | number[]
        | boolean
        | CareerLevel[]
        | LanguageCode[]
        | JobType[]
        | true
    ) => {
      if (filterType === 'clear') {
        setSelectedJobs(filteredJobs);
        return;
      }

      // First apply search filter to the original filtered jobs
      let newFilteredJobs = filterJobsBySearch(filteredJobs, searchTerm || '');

      // Apply type filter
      if (filterType === 'type' && Array.isArray(value) && value.length > 0) {
        // Type assertion to tell TypeScript this is a JobType array
        const jobTypes = value as JobType[];
        newFilteredJobs = newFilteredJobs.filter((job) =>
          jobTypes.includes(job.type as JobType)
        );
      }

      // Apply role/career level filter
      if (filterType === 'role' && Array.isArray(value) && value.length > 0) {
        // Type assertion to tell TypeScript this is a CareerLevel array
        const careerLevels = value as CareerLevel[];
        newFilteredJobs = newFilteredJobs.filter((job) =>
          careerLevels.some((level) => job.career_level.includes(level))
        );
      }

      // Apply remote filter
      if (filterType === 'remote' && value === true) {
        newFilteredJobs = newFilteredJobs.filter(
          (job) => job.workplace_type === 'Remote'
        );
      }

      // Apply salary filter
      if (filterType === 'salary' && Array.isArray(value) && value.length === 2) {
        const [salaryMin, salaryMax] = value as number[];
        if (salaryMin > SALARY_SLIDER_MIN || salaryMax < SALARY_SLIDER_MAX) {
          newFilteredJobs = newFilteredJobs.filter((job) => {
            const annualSalary = normalizeAnnualSalary(job.salary);
            if (annualSalary === -1) {
              return false;
            }
            if (annualSalary < salaryMin) {
              return false;
            }
            if (salaryMax < SALARY_SLIDER_MAX && annualSalary > salaryMax) {
              return false;
            }
            return true;
          });
        }
      }

      // Apply visa filter
      if (filterType === 'visa' && value === true) {
        newFilteredJobs = newFilteredJobs.filter(
          (job) => job.visa_sponsorship === 'Yes'
        );
      }

      // Apply language filter
      if (
        filterType === 'language' &&
        Array.isArray(value) &&
        value.length > 0
      ) {
        // Type assertion to tell TypeScript this is a LanguageCode array
        const languageCodes = value as LanguageCode[];
        newFilteredJobs = newFilteredJobs.filter((job) =>
          job.languages?.some((lang) =>
            languageCodes.includes(lang as LanguageCode)
          )
        );
      }

      // Apply company filter
      if (
        filterType === 'company' &&
        Array.isArray(value) &&
        value.length > 0
      ) {
        const companies = value as string[];
        newFilteredJobs = newFilteredJobs.filter((job) =>
          companies.includes(job.company)
        );
      }

      setSelectedJobs(newFilteredJobs);
    },
    [filteredJobs, searchTerm]
  );

  // Apply search filter whenever the search term changes
  useEffect(() => {
    // Reset filters and apply search
    const searchFiltered = filterJobsBySearch(filteredJobs, searchTerm || '');
    setSelectedJobs(searchFiltered);
  }, [searchTerm, filteredJobs]);

  // Sort jobs
  const sortedJobs = [...selectedJobs].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':
        return (
          new Date(a.posted_date).getTime() - new Date(b.posted_date).getTime()
        );
      case 'salary': {
        const aSalary = normalizeAnnualSalary(a.salary);
        const bSalary = normalizeAnnualSalary(b.salary);
        if (aSalary === -1 && bSalary === -1) return 0;
        if (aSalary === -1) return 1;
        if (bSalary === -1) return -1;
        return bSalary - aSalary;
      }
      default: // newest
        return (
          new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
        );
    }
  });

  // Pagination
  const startIndex = (page - 1) * jobsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + jobsPerPage);

  return (
    <main className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <ClientBreadcrumb />
      </div>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:gap-8">
        {/* Main content */}
        <div className="order-2 flex-[3] lg:order-1">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-0">
            <div className="w-full space-y-1 sm:w-auto">
              <h1 className="flex flex-wrap items-center gap-2 font-semibold text-xl tracking-tight lg:text-2xl">
                Latest Jobs
                {page > 1 && (
                  <span className="font-normal text-gray-500 dark:text-gray-500">Page {page}</span>
                )}
              </h1>
              <p className="text-muted-foreground text-sm">
                Showing {paginatedJobs.length.toLocaleString()} of{' '}
                {sortedJobs.length.toLocaleString()} positions
              </p>
            </div>
            <div className="flex w-full items-center justify-between gap-3 overflow-x-auto pb-1 sm:w-auto sm:justify-end">
              <JobsPerPageSelect />
              <SortOrderSelect />
            </div>
          </div>

          <JobListings jobs={paginatedJobs} />

          {sortedJobs.length > jobsPerPage && (
            <PaginationControl
              itemsPerPage={jobsPerPage}
              totalItems={sortedJobs.length}
            />
          )}

          {/* Post Job Banner - Mobile only */}
          <div className="mt-8 lg:hidden">
            <PostJobBanner />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="order-first w-full lg:order-last lg:w-[240px] xl:w-[260px]">
          <div className="space-y-6">
            <JobFilters
              initialFilters={{
                types: [],
                roles: [],
                remote: false,
                salaryMin: SALARY_SLIDER_MIN,
                salaryMax: SALARY_SLIDER_MAX,
                visa: false,
                languages: [],
                companies: [],
              }}
              jobs={filteredJobs}
              onFilterChange={handleFilterChange}
            />
            {/* Post Job Banner - Desktop only */}
            <div className="hidden lg:block">
              <PostJobBanner />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
