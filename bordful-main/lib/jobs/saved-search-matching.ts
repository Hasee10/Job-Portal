import type { CareerLevel, Job } from '@/lib/db/airtable';
import { normalizeAnnualSalary } from '@/lib/db/airtable';
import type { LanguageCode } from '@/lib/constants/languages';
import { filterJobsBySearch } from '@/lib/utils/filter-jobs';

// Mirrors SALARY_SLIDER_MIN/MAX in components/ui/job-filters.tsx - kept as a
// separate copy here so this server-only matcher doesn't import a 'use
// client' module. Update both if the slider bounds ever change.
const SALARY_MIN = 0;
const SALARY_MAX = 300_000;

export type SavedSearchFilters = {
  types: string[];
  roles: CareerLevel[];
  remote: boolean;
  salaryMin: number;
  salaryMax: number;
  visa: boolean;
  languages: LanguageCode[];
  companies: string[];
};

export const DEFAULT_SAVED_SEARCH_FILTERS: SavedSearchFilters = {
  types: [],
  roles: [],
  remote: false,
  salaryMin: SALARY_MIN,
  salaryMax: SALARY_MAX,
  visa: false,
  languages: [],
  companies: [],
};

// Same rules as the filteredJobs logic in components/home/HomePage.tsx,
// applied to one job at a time so the cron alert job and the client-side
// board can never silently diverge in what counts as "a match".
export function matchesSavedSearch(
  job: Job,
  filters: SavedSearchFilters,
  searchTerm: string | null
): boolean {
  if (searchTerm && filterJobsBySearch([job], searchTerm).length === 0) {
    return false;
  }

  if (filters.types.length > 0 && !filters.types.includes(job.type)) {
    return false;
  }

  if (filters.roles.length > 0) {
    if (!job.career_level.some((level) => filters.roles.includes(level))) {
      return false;
    }
  }

  if (filters.remote && job.workplace_type !== 'Remote') {
    return false;
  }

  if (filters.visa && job.visa_sponsorship !== 'Yes') {
    return false;
  }

  if (filters.salaryMin > SALARY_MIN || filters.salaryMax < SALARY_MAX) {
    if (!job.salary) {
      return false;
    }
    const annualSalary = normalizeAnnualSalary(job.salary);
    if (annualSalary === -1) {
      return false;
    }
    if (annualSalary < filters.salaryMin) {
      return false;
    }
    if (filters.salaryMax < SALARY_MAX && annualSalary > filters.salaryMax) {
      return false;
    }
  }

  if (filters.languages.length > 0) {
    if (!job.languages.some((lang) => filters.languages.includes(lang))) {
      return false;
    }
  }

  if (
    filters.companies.length > 0 &&
    !filters.companies.includes(job.company)
  ) {
    return false;
  }

  return true;
}
