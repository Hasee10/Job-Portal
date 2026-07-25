import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { CareerLevel, Job, SalaryUnit } from '@/lib/db/airtable';
import type { CurrencyCode } from '@/lib/constants/currencies';
import { generateJobSlug } from '@/lib/utils/slugify';
import config from '@/config';

// A job posting is owned by exactly one of an employer or a recruiter -
// both can post jobs (recruiters typically on behalf of client companies),
// so every write/read here is scoped through this owner reference rather
// than assuming employer_id.
export type JobOwner =
  | { employerId: string; recruiterId?: undefined }
  | { recruiterId: string; employerId?: undefined };

export type PostedJob = Job & {
  postedByType: 'employer' | 'recruiter';
  postedById: string;
  acceptsApplications: boolean;
  requiredSkills: string[];
  minExperienceYears: number | null;
  autoShortlistThreshold: number;
  applicationCount: number;
};

export type JobPostInput = {
  title: string;
  type: Job['type'];
  description: string;
  benefits: string | null;
  applicationRequirements: string | null;
  workplaceType: 'On-site' | 'Hybrid' | 'Remote' | 'Not specified';
  workplaceCity: string | null;
  workplaceCountry: string | null;
  careerLevel: CareerLevel[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: CurrencyCode;
  salaryUnit: SalaryUnit;
  skills: string | null;
  requiredSkills: string[];
  minExperienceYears: number | null;
  autoShortlistThreshold: number;
  acceptsApplications: boolean;
  externalApplyUrl: string | null;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function ownerColumn(owner: JobOwner): 'employer_id' | 'recruiter_id' {
  return owner.employerId !== undefined ? 'employer_id' : 'recruiter_id';
}

function ownerId(owner: JobOwner): string {
  return owner.employerId ?? (owner.recruiterId as string);
}

function ownerSource(owner: JobOwner): 'employer' | 'recruiter' {
  return owner.employerId !== undefined ? 'employer' : 'recruiter';
}

function workplaceTypeToRemoteType(workplaceType: string): string {
  switch (workplaceType) {
    case 'Remote':
      return 'remote';
    case 'Hybrid':
      return 'hybrid';
    case 'On-site':
      return 'onsite';
    default:
      return '';
  }
}

function remoteTypeToWorkplaceType(remoteType: unknown): Job['workplace_type'] {
  if (typeof remoteType !== 'string') return 'Not specified';
  switch (remoteType.trim().toLowerCase()) {
    case 'remote':
      return 'Remote';
    case 'hybrid':
      return 'Hybrid';
    case 'onsite':
    case 'on-site':
      return 'On-site';
    default:
      return 'Not specified';
  }
}

function rowToPostedJob(row: Record<string, unknown>): PostedJob {
  const postedByType: PostedJob['postedByType'] = row.recruiter_id ? 'recruiter' : 'employer';
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
            currency: (row.salary_currency as CurrencyCode) || 'USD',
            unit: (row.salary_unit as SalaryUnit) || 'year',
          }
        : null,
    description: (row.description as string) || '',
    benefits: (row.benefits as string) || null,
    application_requirements: (row.application_requirements as string) || null,
    apply_url: (row.apply_url as string) || '',
    posted_date: row.posted_at as string,
    valid_through: (row.valid_through as string) || null,
    job_identifier: (row.job_identifier as string) || null,
    job_source_name: (row.source as string) || null,
    status: row.is_active ? 'active' : 'inactive',
    career_level: (row.career_level as CareerLevel[]) || ['NotSpecified'],
    visa_sponsorship: (row.visa_sponsorship as Job['visa_sponsorship']) || 'Not specified',
    featured: Boolean(row.featured),
    workplace_type: remoteTypeToWorkplaceType(row.remote_type),
    remote_region: null,
    timezone_requirements: (row.timezone_requirements as string) || null,
    workplace_city: (row.workplace_city as string) || null,
    workplace_country: (row.workplace_country as string) || null,
    languages: [],
    skills: (row.skills as string) || null,
    postedByType,
    postedById: (postedByType === 'recruiter' ? row.recruiter_id : row.employer_id) as string,
    acceptsApplications: Boolean(row.accepts_applications),
    requiredSkills: (row.required_skills as string[]) || [],
    minExperienceYears: (row.min_experience_years as number) ?? null,
    autoShortlistThreshold: (row.auto_shortlist_threshold as number) ?? 70,
    applicationCount: Array.isArray(row.job_applications)
      ? (row.job_applications[0]?.count as number) ?? 0
      : 0,
  };
}

export async function createJob(
  owner: JobOwner,
  companyName: string,
  input: JobPostInput
): Promise<PostedJob> {
  const supabase = getAdminClient();

  const slug = generateJobSlug(input.title, companyName);
  const applyUrl = input.acceptsApplications
    ? `${config.url}/jobs/${slug}`
    : (input.externalApplyUrl || '').trim();

  if (!applyUrl) {
    throw new Error('An external apply URL is required unless you accept in-app applications.');
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      [ownerColumn(owner)]: ownerId(owner),
      title: input.title.trim(),
      company: companyName,
      type: input.type,
      description: input.description,
      benefits: input.benefits,
      application_requirements: input.applicationRequirements,
      apply_url: applyUrl,
      source: ownerSource(owner),
      is_active: true,
      posted_at: new Date().toISOString(),
      career_level: input.careerLevel.length > 0 ? input.careerLevel : ['NotSpecified'],
      salary_min: input.salaryMin,
      salary_max: input.salaryMax,
      salary_currency: input.salaryCurrency,
      salary_unit: input.salaryUnit,
      remote_type: workplaceTypeToRemoteType(input.workplaceType),
      workplace_city: input.workplaceCity,
      workplace_country: input.workplaceCountry,
      skills: input.skills,
      required_skills: input.requiredSkills,
      min_experience_years: input.minExperienceYears,
      auto_shortlist_threshold: input.autoShortlistThreshold,
      accepts_applications: input.acceptsApplications,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToPostedJob(data);
}

export async function updateJob(
  owner: JobOwner,
  jobId: string,
  input: Partial<JobPostInput> & { companyName: string }
): Promise<PostedJob> {
  const supabase = getAdminClient();
  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.type !== undefined) patch.type = input.type;
  if (input.description !== undefined) patch.description = input.description;
  if (input.benefits !== undefined) patch.benefits = input.benefits;
  if (input.applicationRequirements !== undefined) patch.application_requirements = input.applicationRequirements;
  if (input.careerLevel !== undefined) patch.career_level = input.careerLevel.length > 0 ? input.careerLevel : ['NotSpecified'];
  if (input.salaryMin !== undefined) patch.salary_min = input.salaryMin;
  if (input.salaryMax !== undefined) patch.salary_max = input.salaryMax;
  if (input.salaryCurrency !== undefined) patch.salary_currency = input.salaryCurrency;
  if (input.salaryUnit !== undefined) patch.salary_unit = input.salaryUnit;
  if (input.workplaceType !== undefined) patch.remote_type = workplaceTypeToRemoteType(input.workplaceType);
  if (input.workplaceCity !== undefined) patch.workplace_city = input.workplaceCity;
  if (input.workplaceCountry !== undefined) patch.workplace_country = input.workplaceCountry;
  if (input.skills !== undefined) patch.skills = input.skills;
  if (input.requiredSkills !== undefined) patch.required_skills = input.requiredSkills;
  if (input.minExperienceYears !== undefined) patch.min_experience_years = input.minExperienceYears;
  if (input.autoShortlistThreshold !== undefined) patch.auto_shortlist_threshold = input.autoShortlistThreshold;
  if (input.acceptsApplications !== undefined) patch.accepts_applications = input.acceptsApplications;
  if (input.externalApplyUrl !== undefined && !input.acceptsApplications) {
    patch.apply_url = input.externalApplyUrl;
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(patch)
    .eq('id', jobId)
    .eq(ownerColumn(owner), ownerId(owner))
    .select('*')
    .single();

  if (error) throw error;
  return rowToPostedJob(data);
}

export async function closeJob(owner: JobOwner, jobId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('jobs')
    .update({ is_active: false, discontinued_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq(ownerColumn(owner), ownerId(owner));
  if (error) throw error;
}

export async function reopenJob(owner: JobOwner, jobId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('jobs')
    .update({ is_active: true, discontinued_at: null })
    .eq('id', jobId)
    .eq(ownerColumn(owner), ownerId(owner));
  if (error) throw error;
}

export async function listOwnerJobs(owner: JobOwner): Promise<PostedJob[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('*, job_applications(count)')
    .eq(ownerColumn(owner), ownerId(owner))
    .order('posted_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToPostedJob(row as unknown as Record<string, unknown>));
}

export async function getOwnerJob(owner: JobOwner, jobId: string): Promise<PostedJob | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('*, job_applications(count)')
    .eq('id', jobId)
    .eq(ownerColumn(owner), ownerId(owner))
    .maybeSingle();

  if (error) throw error;
  return data ? rowToPostedJob(data as unknown as Record<string, unknown>) : null;
}
