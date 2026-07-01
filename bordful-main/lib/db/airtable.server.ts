import 'server-only';

import { cache } from 'react';
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
// Supabase data source
//
// This module replaces the previous Airtable integration. The exported
// functions (getJobs, getJob, testConnection) keep identical signatures and
// return shapes, and every normalizer below is unchanged from the Airtable
// version — they are data-shape guards, not Airtable-specific logic.
//
// Reads go through PostgREST with the anon key (this is a server-only module,
// so the key never reaches the client). Behavior mirrors Airtable exactly:
//   getJobs()  -> all rows where is_active = true, newest posted first
//   getJob(id) -> single row, or null if missing/inactive
// No server-side pagination is added — the full active set is loaded at once,
// matching the previous Airtable `.all()` behavior.
// ---------------------------------------------------------------------------

type SupabaseConfig = { url: string; key: string };

const getSupabaseConfig = cache((): SupabaseConfig | null => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url: url.replace(/\/$/, ''), key };
});

// Low-level PostgREST GET against the jobs table. Returns parsed rows, or
// throws so the callers below can fall back to their empty/null defaults —
// exactly like the Airtable try/catch did.
async function queryJobs(
  config: SupabaseConfig,
  queryString: string
): Promise<Record<string, unknown>[]> {
  const response = await fetch(
    `${config.url}/rest/v1/jobs?${queryString}`,
    {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: 'application/json',
      },
      // Job data is refreshed by n8n on a schedule; don't cache at the fetch
      // layer (React's cache() already dedupes within a request).
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>[];
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

// Assemble a Supabase row into the Job shape. Kept in one place so getJobs and
// getJob can't drift apart (the Airtable version duplicated this inline).
function rowToJob(row: Record<string, unknown>): Job {
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
    description: normalizeMarkdown(row.description as string),
    benefits: normalizeBenefits(row.benefits),
    application_requirements: normalizeApplicationRequirements(
      row.application_requirements
    ),
    apply_url: row.apply_url as string,
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

export const getJobs = cache(async (): Promise<Job[]> => {
  const config = getSupabaseConfig();
  if (!config) {
    return [];
  }

  try {
    // status = 'active' -> is_active = true; posted_date desc -> posted_at desc.
    // No limit: return every matching row, matching Airtable's .all().
    const rows = await queryJobs(
      config,
      'select=*&is_active=eq.true&order=posted_at.desc.nullslast'
    );

    return rows.map(rowToJob);
  } catch {
    return [];
  }
});

export const getJob = cache(async (id: string): Promise<Job | null> => {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  try {
    const rows = await queryJobs(
      config,
      `select=*&id=eq.${encodeURIComponent(id)}&limit=1`
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    // Mirror Airtable's getJob: only return active postings.
    if (!row.is_active) {
      return null;
    }

    return rowToJob(row);
  } catch {
    return null;
  }
});

export async function testConnection(): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) {
    return false;
  }

  try {
    await queryJobs(config, 'select=id&limit=1');
    return true;
  } catch {
    return false;
  }
}
