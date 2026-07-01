-- Bordful integration: add the Job-type fields that the board renders but the
-- n8n collector never populated. Defaults mirror what airtable.server.ts's
-- normalizer functions already fall back to, so existing rows stay valid.
--
-- Additive only (add column if not exists). Safe to re-run.

alter table public.jobs
  -- employment type: cast directly in code (no normalizer); default to Full-time
  add column if not exists type text not null default 'Full-time',

  -- salary object (only assembled when salary_min or salary_max is present)
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists salary_currency text not null default 'USD',   -- normalizeCurrency default
  add column if not exists salary_unit text not null default 'year',       -- cast directly; safe SalaryUnit default

  -- free-text blocks (normalizeBenefits / normalizeApplicationRequirements default null)
  add column if not exists benefits text,
  add column if not exists application_requirements text,

  -- posting lifecycle / identity
  add column if not exists valid_through timestamptz,
  add column if not exists job_identifier text,

  -- career level (normalizeCareerLevel default ['NotSpecified'])
  add column if not exists career_level text[] not null default array['NotSpecified']::text[],

  -- visa (normalizeVisaSponsorship default 'Not specified')
  add column if not exists visa_sponsorship text not null default 'Not specified',

  -- featured flag (!!fields.featured -> false when absent)
  add column if not exists featured boolean not null default false,

  -- location / remote details (normalizeRemoteRegion default null)
  add column if not exists remote_region text,
  add column if not exists timezone_requirements text,
  add column if not exists workplace_city text,
  add column if not exists workplace_country text,

  -- languages (normalizeLanguages default [])
  add column if not exists languages text[] not null default array[]::text[],

  -- schema.org structured-data fields (all default null in the mapper)
  add column if not exists skills text,
  add column if not exists qualifications text,
  add column if not exists education_requirements text,
  add column if not exists experience_requirements text,
  add column if not exists industry text,
  add column if not exists occupational_category text,
  add column if not exists responsibilities text;
