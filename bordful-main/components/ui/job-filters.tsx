import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  useQueryState,
} from 'nuqs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CAREER_LEVEL_DISPLAY_NAMES } from '@/lib/constants/career-levels';
import {
  JOB_TYPE_DISPLAY_NAMES,
  type JobType,
} from '@/lib/constants/job-types';
import {
  getDisplayNameFromCode,
  type LanguageCode,
} from '@/lib/constants/languages';
import {
  type CareerLevel,
  type Job,
  normalizeAnnualSalary,
} from '@/lib/db/airtable';

type FilterType =
  | 'type'
  | 'role'
  | 'remote'
  | 'salary'
  | 'visa'
  | 'language'
  | 'company'
  | 'clear';
type FilterValue = string[] | boolean | CareerLevel[] | LanguageCode[] | true;

type JobFiltersProps = {
  onFilterChange: (filterType: FilterType, value: FilterValue) => void;
  initialFilters: {
    types: string[];
    roles: CareerLevel[];
    remote: boolean;
    salaryRanges: string[];
    visa: boolean;
    languages: LanguageCode[];
    companies: string[];
  };
  jobs: Job[];
};

// Filter Item component to make UI more DRY
type FilterItemProps = {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function FilterItem({
  id,
  label,
  count,
  checked,
  onCheckedChange,
}: FilterItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Checkbox checked={checked} id={id} onCheckedChange={onCheckedChange} />
        <Label className="font-normal text-sm" htmlFor={id}>
          {label}
        </Label>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          checked ? 'bg-zinc-900 text-zinc-50' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
        }`}
      >
        {count.toLocaleString()}
      </span>
    </div>
  );
}

// Switch Item component for boolean filters
type SwitchItemProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  count: number;
  total?: number;
};

function SwitchItem({
  id,
  checked,
  onCheckedChange,
  count,
  total,
}: SwitchItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
        <Label className="font-normal text-gray-500 dark:text-gray-500 text-sm" htmlFor={id}>
          {checked ? 'Yes' : 'No'}
        </Label>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          checked ? 'bg-zinc-900 text-zinc-50' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
        }`}
      >
        {count.toLocaleString()}
        {total ? ` of ${total.toLocaleString()}` : ''}
      </span>
    </div>
  );
}

export function JobFilters({
  onFilterChange,
  initialFilters,
  jobs,
}: JobFiltersProps) {
  // Mobile expand/collapse state
  const [isExpanded, setIsExpanded] = useState(false);

  // URL state for job types filter using nuqs
  const [typesParam, setTypesParam] = useQueryState(
    'types',
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // URL state for career levels filter using nuqs
  const [rolesParam, setRolesParam] = useQueryState(
    'roles',
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // URL state for salary ranges filter using nuqs
  const [salaryRangesParam, setSalaryRangesParam] = useQueryState(
    'salary',
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // URL state for languages filter using nuqs
  const [languagesParam, setLanguagesParam] = useQueryState(
    'languages',
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // URL state for company filter using nuqs
  const [companiesParam, setCompaniesParam] = useQueryState(
    'companies',
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // URL state for boolean filters using nuqs
  const [remoteParam, setRemoteParam] = useQueryState(
    'remote',
    parseAsBoolean.withDefault(false)
  );

  const [visaParam, setVisaParam] = useQueryState(
    'visa',
    parseAsBoolean.withDefault(false)
  );

  // Initialize URL state with initialFilters when there are no URL params.
  // Mount-only by design (see the ref guard): `initialFilters` is a plain
  // object literal recomputed on every render of the parent (HomePageContent
  // builds it fresh from useSearchParams() each time, not memoized), so it
  // gets a new object reference on every render. With that in the dependency
  // array, this effect re-ran on every render, not just mount - and since the
  // parent's searchParams snapshot can still reflect the *previous* URL for
  // a render or two after a nuqs update (the URL write and this component's
  // re-render aren't perfectly synchronous), unchecking a filter could
  // re-trigger this effect with a stale "the URL still says checked" value
  // and immediately re-check the box the user just unchecked. Running this
  // exactly once, using whatever initialFilters was at first mount, removes
  // that race entirely - the whole point of this effect is a one-time seed
  // from the initial URL, not an ongoing sync.
  const hasInitializedFromUrl = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only initialization (see comment above), not an ongoing sync
  useEffect(() => {
    if (hasInitializedFromUrl.current) {
      return;
    }
    hasInitializedFromUrl.current = true;

    if (typesParam.length === 0 && initialFilters.types.length > 0) {
      setTypesParam(initialFilters.types);
    }

    if (rolesParam.length === 0 && initialFilters.roles.length > 0) {
      setRolesParam(initialFilters.roles);
    }

    if (
      salaryRangesParam.length === 0 &&
      initialFilters.salaryRanges.length > 0
    ) {
      setSalaryRangesParam(initialFilters.salaryRanges);
    }

    if (languagesParam.length === 0 && initialFilters.languages.length > 0) {
      setLanguagesParam(initialFilters.languages);
    }

    if (companiesParam.length === 0 && initialFilters.companies.length > 0) {
      setCompaniesParam(initialFilters.companies);
    }

    if (!remoteParam && initialFilters.remote) {
      setRemoteParam(initialFilters.remote);
    }

    if (!visaParam && initialFilters.visa) {
      setVisaParam(initialFilters.visa);
    }
  }, []);

  // NOTE ON WHY THESE ARE PLAIN FUNCTIONS, NOT useCallback:
  //
  // The previous version wrapped each handler in
  //   useCallback(createArrayFilterHandler('role', rolesParam, setRolesParam), [])
  // with an EMPTY dependency array. Because the factory was called during
  // render, `rolesParam` (etc.) was captured at *first* render - when it's
  // always the default `[]` - and then frozen forever by the empty deps. So
  // every click computed `newValues` from a stale empty array: you could
  // never select a second value in a group (it replaced the first), and
  // unchecking never worked (it filtered against []). That made the filters
  // look broken.
  //
  // Defining them inline recreates the functions each render, which is fine
  // for event handlers and guarantees they always read the *current* nuqs
  // param values. onFilterChange (which actually re-filters the visible job
  // list) is called first and synchronously; the nuqs URL sync runs after as
  // a fire-and-forget side effect so a router rejection can't swallow the
  // real filtering.
  const syncToUrl = (promise: Promise<unknown>) => {
    promise.catch((err) => {
      console.error('Failed to sync filter to URL:', err);
    });
  };

  const handleTypeChange = (checked: boolean, value: string) => {
    const newValues = checked
      ? [...typesParam, value]
      : typesParam.filter((item) => item !== value);
    onFilterChange('type', newValues);
    syncToUrl(setTypesParam(newValues.length ? newValues : null));
  };

  const handleLevelChange = (checked: boolean, value: string) => {
    const newValues = checked
      ? [...rolesParam, value]
      : rolesParam.filter((item) => item !== value);
    onFilterChange('role', newValues as CareerLevel[]);
    syncToUrl(setRolesParam(newValues.length ? newValues : null));
  };

  const handleSalaryChange = (checked: boolean, value: string) => {
    const newValues = checked
      ? [...salaryRangesParam, value]
      : salaryRangesParam.filter((item) => item !== value);
    onFilterChange('salary', newValues);
    syncToUrl(setSalaryRangesParam(newValues.length ? newValues : null));
  };

  const handleLanguageChange = (checked: boolean, value: string) => {
    const newValues = checked
      ? [...languagesParam, value]
      : languagesParam.filter((item) => item !== value);
    onFilterChange('language', newValues as LanguageCode[]);
    syncToUrl(setLanguagesParam(newValues.length ? newValues : null));
  };

  const handleCompanyChange = (checked: boolean, value: string) => {
    const newValues = checked
      ? [...companiesParam, value]
      : companiesParam.filter((item) => item !== value);
    onFilterChange('company', newValues);
    syncToUrl(setCompaniesParam(newValues.length ? newValues : null));
  };

  const handleRemoteChange = (checked: boolean) => {
    onFilterChange('remote', checked);
    syncToUrl(setRemoteParam(checked || null));
  };

  const handleVisaChange = (checked: boolean) => {
    onFilterChange('visa', checked);
    syncToUrl(setVisaParam(checked || null));
  };

  // Toggle states for expandable sections
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  // Predefined lists
  const initialLevels: CareerLevel[] = [
    'Internship',
    'EntryLevel',
    'Associate',
    'Junior',
    'MidLevel',
    'Senior',
    'Staff',
    'Principal',
  ];

  const additionalLevels: CareerLevel[] = [
    'Lead',
    'Manager',
    'SeniorManager',
    'Director',
    'SeniorDirector',
    'VP',
    'SVP',
    'EVP',
    'CLevel',
    'Founder',
  ];

  // Handle clearing all filters - clears every nuqs param and tells the
  // parent to reset the visible list in one go.
  const handleClearFilters = () => {
    onFilterChange('clear', true);
    syncToUrl(
      Promise.all([
        setTypesParam(null),
        setRolesParam(null),
        setSalaryRangesParam(null),
        setLanguagesParam(null),
        setCompaniesParam(null),
        setRemoteParam(null),
        setVisaParam(null),
      ])
    );
  };

  // Memoized counts and calculations
  const counts = useMemo(
    () => ({
      types: jobs.reduce(
        (acc, job) => {
          if (job.type) {
            acc[job.type] = (acc[job.type] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      ),

      roles: jobs.reduce(
        (acc, job) => {
          job.career_level.forEach((level) => {
            if (level !== 'NotSpecified') {
              acc[level] = (acc[level] || 0) + 1;
            }
          });
          return acc;
        },
        {} as Record<CareerLevel, number>
      ),

      remote: jobs.filter((job) => job.workplace_type === 'Remote').length,

      visa: jobs.filter((job) => job.visa_sponsorship === 'Yes').length,

      salary: jobs.reduce(
        (acc, job) => {
          if (!job.salary) {
            return acc;
          }
          const annualSalary = normalizeAnnualSalary(job.salary);
          if (annualSalary < 50_000) {
            acc['< $50K']++;
          } else if (annualSalary <= 100_000) {
            acc['$50K - $100K']++;
          } else if (annualSalary <= 200_000) {
            acc['$100K - $200K']++;
          } else {
            acc['> $200K']++;
          }
          return acc;
        },
        {
          '< $50K': 0,
          '$50K - $100K': 0,
          '$100K - $200K': 0,
          '> $200K': 0,
        }
      ),

      languages: jobs.reduce(
        (acc, job) => {
          job.languages?.forEach((lang) => {
            acc[lang] = (acc[lang] || 0) + 1;
          });
          return acc;
        },
        {} as Record<LanguageCode, number>
      ),

      companies: jobs.reduce(
        (acc, job) => {
          if (job.company) {
            acc[job.company] = (acc[job.company] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      ),
    }),
    [jobs]
  );

  // Sort and filter languages
  const languageEntries = useMemo(() => {
    const entries = Object.entries(counts.languages)
      // Sort alphabetically by language name for better UX
      .sort((a, b) => {
        const nameA = getDisplayNameFromCode(a[0] as LanguageCode);
        const nameB = getDisplayNameFromCode(b[0] as LanguageCode);
        return nameA.localeCompare(nameB);
      })
      .filter(([, count]) => count > 0);

    return {
      initial: entries.slice(0, 5),
      additional: entries.slice(5),
      visible: showAllLanguages ? entries : entries.slice(0, 5),
    };
  }, [counts.languages, showAllLanguages]);

  // Visible levels based on toggle
  const visibleLevels = showAllLevels
    ? [...initialLevels, ...additionalLevels]
    : initialLevels;

  // Company entries sorted by count desc
  const companyEntries = useMemo(() => {
    const entries = Object.entries(counts.companies)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > 0);
    return {
      visible: showAllCompanies ? entries : entries.slice(0, 6),
      extra: entries.length > 6 ? entries.length - 6 : 0,
    };
  }, [counts.companies, showAllCompanies]);

  return (
    <div className="relative rounded-lg border bg-muted p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-md">Filters</h2>
          <button
            aria-controls="filter-content"
            aria-expanded={isExpanded}
            className="flex items-center text-sm text-zinc-900 dark:text-zinc-100 md:hidden"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isExpanded ? 'Collapse filters' : 'Expand filters'}
            </span>
          </button>
        </div>
        <button
          className="text-sm text-zinc-900 dark:text-zinc-100 underline underline-offset-4 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
          onClick={handleClearFilters}
        >
          Clear all
        </button>
      </div>

      {isExpanded && (
        <div className="my-4 h-[1px] w-full bg-gray-200 md:hidden" />
      )}

      <div
        className={`${isExpanded ? 'mt-6' : 'mt-0'} space-y-6 ${
          isExpanded ? 'block' : 'hidden md:mt-6 md:block'
        }`}
        id="filter-content"
      >
        {/* Company */}
        {companyEntries.visible.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-md">Company</h3>
            <div className="space-y-3">
              {companyEntries.visible.map(([company, count]) => (
                <FilterItem
                  checked={companiesParam.includes(company)}
                  count={count}
                  id={`company-${company.toLowerCase().replace(/\s+/g, '-')}`}
                  key={company}
                  label={company}
                  onCheckedChange={(checked) => handleCompanyChange(checked, company)}
                />
              ))}
            </div>
            {companyEntries.extra > 0 && (
              <button
                className="text-sm text-zinc-900 dark:text-zinc-100 underline underline-offset-4 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                onClick={() => setShowAllCompanies(!showAllCompanies)}
              >
                {showAllCompanies
                  ? 'Show fewer companies'
                  : `Show ${companyEntries.extra} more compan${companyEntries.extra === 1 ? 'y' : 'ies'}`}
              </button>
            )}
          </div>
        )}

        {/* Job Type */}
        <div className="space-y-4">
          <h3 className="font-semibold text-md">Job Type</h3>
          <div className="space-y-3">
            {/* Map over job types from constants instead of hardcoding */}
            {Object.entries(JOB_TYPE_DISPLAY_NAMES).map(
              ([type, displayName]) => (
                <FilterItem
                  checked={typesParam.includes(type)}
                  count={counts.types[type as JobType] || 0}
                  id={`job-type-${type}`}
                  key={type}
                  label={displayName}
                  onCheckedChange={(checked) => handleTypeChange(checked, type)}
                />
              )
            )}
          </div>
        </div>

        {/* Career Level */}
        <div className="space-y-4">
          <h3 className="font-semibold text-md">Career Level</h3>
          <div className="space-y-3">
            {visibleLevels.map((level) => (
              <FilterItem
                checked={rolesParam.includes(level)}
                count={counts.roles[level] || 0}
                id={level.toLowerCase().replace(' ', '-')}
                key={level}
                label={CAREER_LEVEL_DISPLAY_NAMES[level]}
                onCheckedChange={(checked) => handleLevelChange(checked, level)}
              />
            ))}
          </div>
          <button
            className="text-sm text-zinc-900 dark:text-zinc-100 underline underline-offset-4 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            onClick={() => setShowAllLevels(!showAllLevels)}
          >
            {showAllLevels ? 'Show fewer levels' : 'Show more levels'}
          </button>
        </div>

        {/* Remote Only */}
        <div className="space-y-4">
          <h3 className="font-semibold text-md">Remote Only</h3>
          <SwitchItem
            checked={remoteParam}
            count={counts.remote}
            id="remote-only"
            onCheckedChange={handleRemoteChange}
            total={jobs.length}
          />
        </div>

        {/* Salary Range */}
        <div className="space-y-4">
          <h3 className="font-semibold text-md">Salary Range</h3>
          <div className="space-y-3">
            {Object.entries(counts.salary).map(([range, count]) => (
              <FilterItem
                checked={salaryRangesParam.includes(range)}
                count={count}
                id={`salary-${range.toLowerCase().replace(/[\s$>]/g, '-')}`}
                key={range}
                label={`${range}/year`}
                onCheckedChange={(checked) =>
                  handleSalaryChange(checked, range)
                }
              />
            ))}
          </div>
        </div>

        {/* Visa Sponsorship */}
        <div className="space-y-4">
          <h3 className="font-semibold text-md">Visa Sponsorship</h3>
          <SwitchItem
            checked={visaParam}
            count={counts.visa || 0}
            id="visa-sponsorship"
            onCheckedChange={handleVisaChange}
          />
        </div>

        {/* Languages */}
        <div className="space-y-4">
          <h3 className="font-semibold text-md">Languages</h3>
          <div className="space-y-3">
            {languageEntries.visible.map(([lang, count]) => (
              <FilterItem
                checked={languagesParam.includes(lang)}
                count={count}
                id={`lang-${lang.toLowerCase()}`}
                key={lang}
                label={getDisplayNameFromCode(lang as LanguageCode)}
                onCheckedChange={(checked) =>
                  handleLanguageChange(checked, lang as LanguageCode)
                }
              />
            ))}
          </div>
          {languageEntries.additional.length > 0 && (
            <button
              className="text-sm text-zinc-900 dark:text-zinc-100 underline underline-offset-4 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
              onClick={() => setShowAllLanguages(!showAllLanguages)}
            >
              {showAllLanguages
                ? 'Show fewer languages'
                : `Show ${languageEntries.additional.length} more language${
                    languageEntries.additional.length > 1 ? 's' : ''
                  }`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
