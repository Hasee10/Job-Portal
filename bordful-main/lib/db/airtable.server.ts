import 'server-only';

import type { Pool } from 'pg';
import { cache } from 'react';
import { getPool } from '@/lib/db/pool';
import {
  CURRENCY_CODES,
  type CurrencyCode,
  getCurrencyByName,
} from '@/lib/constants/currencies';
import {
  getLanguageByName,
  LANGUAGE_CODES,
  type LanguageCode,
} from '@/lib/constants/languages';
import type { RemoteRegion, WorkplaceType } from '@/lib/constants/workplace';
import { normalizeMarkdown } from '@/lib/utils/markdown';
import type { CareerLevel, Job, SalaryUnit } from '@/lib/db/airtable';

// ---------------------------------------------------------------------------
// CockroachDB data source
//
// Cut over from Supabase/PostgREST to a direct SQL connection - CockroachDB
// has no auto-generated REST API to read through. The exported functions
// (getJobs, getJob, testConnection) keep identical signatures and return
// shapes, and every normalizer below is unchanged from the Supabase/Airtable
// version - they are data-shape guards, independent of the transport.
//
// IMPORTANT: this connects with the same single credential used for writes
// (COCKROACH_DATABASE_URL) - there's no RLS/anon-key equivalent in
// CockroachDB to enforce read-only access the way Supabase's anon key did.
// A dedicated read-only SQL user is worth setting up before this goes to
// production; nothing here currently prevents this pool from writing.
// ---------------------------------------------------------------------------

// Job data is refreshed by the scraper on a schedule - every query below
// reads live, no query-level caching (React's cache() already dedupes
// identical calls within a single request).
async function queryJobs(
  pool: Pool,
  whereClause: string,
  params: unknown[],
  options?: { columns?: string; limit?: number }
): Promise<Record<string, unknown>[]> {
  const columns = options?.columns ?? '*';
  const limitClause = options?.limit ? ` limit ${Number(options.limit)}` : '';
  const { rows } = await pool.query(
    `select ${columns} from public.jobs ${whereClause}${limitClause}`,
    params
  );
  return rows;
}

// Ensure career level is always returned as an array
function normalizeCareerLevel(value: unknown): CareerLevel[] {
  if (!value) {
    return ['NotSpecified'];
  }

  if (Array.isArray(value)) {
    // Convert Airtable's display values to our enum values
    return value.map((level) => {
      // Handle Airtable's display format (e.g., "Entry Level" -> "EntryLevel")
      const normalized = level.replace(/\s+/g, '');
      return normalized as CareerLevel;
    });
  }

  // Handle single value
  const normalized = (value as string).replace(/\s+/g, '');
  return [normalized as CareerLevel];
}

function normalizeWorkplaceType(value: unknown): WorkplaceType {
  if (
    typeof value === 'string' &&
    ['On-site', 'Hybrid', 'Remote'].includes(value)
  ) {
    return value as WorkplaceType;
  }

  return 'Not specified';
}

function normalizeRemoteRegion(value: unknown): RemoteRegion {
  if (typeof value === 'string') {
    const validRegions = [
      'Worldwide',
      'Americas Only',
      'Europe Only',
      'Asia-Pacific Only',
      'US Only',
      'EU Only',
      'UK/EU Only',
      'US/Canada Only',
    ];
    if (validRegions.includes(value)) {
      return value as RemoteRegion;
    }
  }
  return null;
}

// Function to normalize language data from Airtable
function normalizeLanguages(value: unknown): LanguageCode[] {
  if (!value) {
    return [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        // Extract code from "Language Name (code)" format
        const languageCodeMatch = /.*?\(([a-z]{2})\)$/i.exec(item);
        if (languageCodeMatch?.[1]) {
          const extractedCode = languageCodeMatch[1].toLowerCase();
          if (LANGUAGE_CODES.includes(extractedCode as LanguageCode)) {
            return extractedCode as LanguageCode;
          }
        }

        // String itself is a valid 2-letter code
        if (
          item.length === 2 &&
          LANGUAGE_CODES.includes(item.toLowerCase() as LanguageCode)
        ) {
          return item.toLowerCase() as LanguageCode;
        }

        // Try to look up by language name
        const language = getLanguageByName(item);
        if (language) {
          return language.code as LanguageCode;
        }
      }

      return null;
    })
    .filter((code): code is LanguageCode => code !== null);
}

// Function to normalize currency data from Airtable
function normalizeCurrency(value: unknown): CurrencyCode {
  if (!value) {
    return 'USD';
  }

  if (typeof value === 'string') {
    // Extract code from "USD (United States Dollar)" format
    const currencyCodeMatch = /^([A-Z]{2,5})\s*\(.*?\)$/i.exec(value);
    if (currencyCodeMatch?.[1]) {
      const extractedCode = currencyCodeMatch[1].toUpperCase();
      if (CURRENCY_CODES.includes(extractedCode as CurrencyCode)) {
        return extractedCode as CurrencyCode;
      }
    }

    // String itself is a valid currency code
    const upperCaseValue = value.toUpperCase();
    if (CURRENCY_CODES.includes(upperCaseValue as CurrencyCode)) {
      return upperCaseValue as CurrencyCode;
    }

    // Try to look up by currency name
    const currency = getCurrencyByName(value);
    if (currency) {
      return currency.code;
    }
  }

  return 'USD';
}

function normalizeBenefits(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const benefitsText = String(value).trim();
  if (!benefitsText) {
    return null;
  }

  const MAX_BENEFITS_LENGTH = 1000;
  if (benefitsText.length > MAX_BENEFITS_LENGTH) {
    return benefitsText.substring(0, MAX_BENEFITS_LENGTH).trim();
  }

  return benefitsText;
}

function normalizeApplicationRequirements(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const requirementsText = String(value).trim();
  if (!requirementsText) {
    return null;
  }

  const MAX_REQUIREMENTS_LENGTH = 1000;
  if (requirementsText.length > MAX_REQUIREMENTS_LENGTH) {
    return requirementsText.substring(0, MAX_REQUIREMENTS_LENGTH).trim();
  }

  return requirementsText;
}

function normalizeVisaSponsorship(
  value: unknown
): 'Yes' | 'No' | 'Not specified' {
  if (!value) {
    return 'Not specified';
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    if (/^yes$/i.test(normalizedValue)) {
      return 'Yes';
    }
    if (/^no$/i.test(normalizedValue)) {
      return 'No';
    }
  }

  return 'Not specified';
}

// Adapt the collector's lowercase remote_type ('remote' | 'hybrid' | 'onsite')
// into the exact casing normalizeWorkplaceType expects. Anything unrecognized
// falls through to the normalizer's 'Not specified' default.
function mapRemoteTypeToWorkplace(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  switch (value.trim().toLowerCase()) {
    case 'remote':
      return 'Remote';
    case 'hybrid':
      return 'Hybrid';
    case 'onsite':
    case 'on-site':
      return 'On-site';
    default:
      return '';
  }
}

// apply_url is rendered directly as an <a href> in several places. It comes
// from external, scraped job boards, so a listing with a 'javascript:' or
// 'data:' URL would execute in the visitor's browser on click. Only allow
// http(s) links through; anything else becomes '' (falsy, so the templates
// that already gate on `job.apply_url &&` simply hide the Apply button).
function sanitizeApplyUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? value
      : '';
  } catch {
    return '';
  }
}

// Assemble a Supabase row into the Job shape. Kept in one place so getJobs and
// getJob can't drift apart (the Airtable version duplicated this inline).
//
// `lite` skips the expensive text-normalization steps (normalizeMarkdown
// runs a full remark/unified parse per call, benefits/application_requirements
// do lighter but still non-trivial parsing). getJobs() uses lite=true because
// listing pages, search, and slug lookups never render description/benefits/
// application_requirements (confirmed against filter-jobs.ts and JobCard) -
// running the full markdown pipeline over every one of several thousand rows
// just to throw the result away was the dominant cost in a ~19s homepage
// load. Callers that need the real parsed content for one specific job
// (the job detail page) fetch it via getJob(id) instead.
function rowToJob(row: Record<string, unknown>, options?: { lite?: boolean }): Job {
  const lite = options?.lite ?? false;
  return {
    id: row.id as string,
    title: row.title as string,
    company: row.company as string,
    type: row.type as Job['type'],
    salary:
      row.salary_min || row.salary_max
        ? {
            min: row.salary_min ? Number(row.salary_min) : null,
            max: row.salary_max ? Number(row.salary_max) : null,
            currency: normalizeCurrency(row.salary_currency),
            unit: row.salary_unit as SalaryUnit,
          }
        : null,
    description: lite ? '' : normalizeMarkdown(row.description as string),
    benefits: lite ? null : normalizeBenefits(row.benefits),
    application_requirements: lite
      ? null
      : normalizeApplicationRequirements(row.application_requirements),
    apply_url: sanitizeApplyUrl(row.apply_url),
    // Supabase stores this as posted_at (timestamptz); the Job type calls it
    // posted_date. PostgREST returns it as an ISO string.
    posted_date: row.posted_at as string,
    valid_through: (row.valid_through as string) || null,
    job_identifier: (row.job_identifier as string) || null,
    // Supabase column is `source`; the Job type field is job_source_name.
    job_source_name: (row.source as string) || null,
    // Supabase tracks liveness as is_active (boolean); the Job type uses a
    // 'active' | 'inactive' string.
    status: row.is_active ? 'active' : 'inactive',
    career_level: normalizeCareerLevel(row.career_level),
    visa_sponsorship: normalizeVisaSponsorship(row.visa_sponsorship),
    featured: !!row.featured,
    workplace_type: normalizeWorkplaceType(
      mapRemoteTypeToWorkplace(row.remote_type)
    ),
    remote_region: normalizeRemoteRegion(row.remote_region),
    timezone_requirements: (row.timezone_requirements as string) || null,
    workplace_city: (row.workplace_city as string) || null,
    workplace_country: (row.workplace_country as string) || null,
    languages: normalizeLanguages(row.languages),
    skills: (row.skills as string) || null,
    qualifications: (row.qualifications as string) || null,
    education_requirements: (row.education_requirements as string) || null,
    experience_requirements: (row.experience_requirements as string) || null,
    industry: (row.industry as string) || null,
    occupational_category: (row.occupational_category as string) || null,
    responsibilities: (row.responsibilities as string) || null,
  };
}

// Columns listing pages actually use (confirmed against JobCard.tsx,
// filter-jobs.ts, and job-filters.tsx) - deliberately excludes description,
// benefits, application_requirements, skills, qualifications,
// education_requirements, experience_requirements, responsibilities,
// industry, and occupational_category, which are large free-text fields
// only ever rendered on the single-job detail page (via getJob(id)).
const JOBS_LIST_COLUMNS = [
  'id',
  'title',
  'company',
  'type',
  'salary_min',
  'salary_max',
  'salary_currency',
  'salary_unit',
  'apply_url',
  'posted_at',
  'valid_through',
  'job_identifier',
  'source',
  'is_active',
  'career_level',
  'visa_sponsorship',
  'featured',
  'remote_type',
  'remote_region',
  'timezone_requirements',
  'workplace_city',
  'workplace_country',
  'languages',
].join(',');

export const getJobs = cache(
  async (options?: { limit?: number }): Promise<Job[]> => {
    const pool = getPool();
    if (!pool) {
      return [];
    }

    try {
      // Projects a reduced column set (see JOBS_LIST_COLUMNS) since this feeds
      // listing/search/slug-lookup, none of which render the heavy text
      // fields - keeps both the per-row size and normalization cost down as
      // the table grows. With a limit (e.g. the homepage's most-recent-N
      // view), a single bounded query is both cheaper and faster than
      // fetching every active row and throwing most of it away.
      const rows = await queryJobs(
        pool,
        'where is_active = true order by posted_at desc nulls last',
        [],
        { columns: JOBS_LIST_COLUMNS, limit: options?.limit }
      );

      return rows.map((row) => rowToJob(row, { lite: true }));
    } catch {
      return [];
    }
  }
);

// Cheap count of active jobs, used where only the total matters (e.g. the
// homepage's "Open Jobs" stat) so it stays accurate even when getJobs() is
// called with a limit that caps the actual row data returned.
export const getActiveJobsCount = cache(async (): Promise<number> => {
  const pool = getPool();
  if (!pool) {
    return 0;
  }

  try {
    const { rows } = await pool.query(
      'select count(*)::int as count from public.jobs where is_active = true'
    );
    return (rows[0]?.count as number) ?? 0;
  } catch {
    return 0;
  }
});

export const getJob = cache(async (id: string): Promise<Job | null> => {
  const pool = getPool();
  if (!pool) {
    return null;
  }

  try {
    const rows = await queryJobs(pool, 'where id = $1', [id], { limit: 1 });

    const row = rows[0];
    if (!row) {
      return null;
    }

    // Mirror the previous behavior: only return active postings.
    if (!row.is_active) {
      return null;
    }

    return rowToJob(row);
  } catch {
    return null;
  }
});

export async function testConnection(): Promise<boolean> {
  const pool = getPool();
  if (!pool) {
    return false;
  }

  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  }
}
