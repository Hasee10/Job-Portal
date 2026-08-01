'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { JobAssistantWidget } from '@/components/employer/JobAssistantWidget';
import { useToast } from '@/hooks/use-toast';
import type { CareerLevel, Job } from '@/lib/db/airtable';
import type { PostedJob } from '@/lib/jobs/employer-job-actions';

const JOB_TYPES: Job['type'][] = ['Full-time', 'Part-time', 'Contract', 'Freelance'];
const WORKPLACE_TYPES = ['On-site', 'Hybrid', 'Remote', 'Not specified'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'CAD', 'AUD'];
const SALARY_UNITS = ['hour', 'day', 'week', 'month', 'year', 'project'] as const;
const CAREER_LEVELS: CareerLevel[] = [
  'Internship', 'EntryLevel', 'Associate', 'Junior', 'MidLevel', 'Senior',
  'Staff', 'Lead', 'Manager', 'Director', 'VP', 'CLevel',
];

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function JobPostForm({
  job,
  apiBasePath = '/api/employer/jobs',
  jobsListPath = '/dashboard/jobs',
}: {
  job?: PostedJob;
  apiBasePath?: string;
  jobsListPath?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = Boolean(job);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState(job?.title ?? '');
  const [type, setType] = useState<Job['type']>(job?.type ?? 'Full-time');
  const [description, setDescription] = useState(job?.description ?? '');
  const [workplaceType, setWorkplaceType] = useState<(typeof WORKPLACE_TYPES)[number]>(
    (job?.workplace_type as (typeof WORKPLACE_TYPES)[number]) ?? 'Not specified'
  );
  const [workplaceCity, setWorkplaceCity] = useState(job?.workplace_city ?? '');
  const [workplaceCountry, setWorkplaceCountry] = useState(job?.workplace_country ?? '');
  const [careerLevel, setCareerLevel] = useState<CareerLevel[]>(
    job?.career_level?.filter((l) => l !== 'NotSpecified') ?? []
  );
  const [salaryMin, setSalaryMin] = useState(job?.salary?.min?.toString() ?? '');
  const [salaryMax, setSalaryMax] = useState(job?.salary?.max?.toString() ?? '');
  const [salaryCurrency, setSalaryCurrency] = useState<string>(job?.salary?.currency ?? 'USD');
  const [salaryUnit, setSalaryUnit] = useState<(typeof SALARY_UNITS)[number]>(job?.salary?.unit ?? 'year');
  const [skills, setSkills] = useState(job?.skills ?? '');
  const [requiredSkillsRaw, setRequiredSkillsRaw] = useState(job?.requiredSkills.join(', ') ?? '');
  const [minExperienceYears, setMinExperienceYears] = useState(job?.minExperienceYears?.toString() ?? '');
  const [autoShortlistThreshold, setAutoShortlistThreshold] = useState(job?.autoShortlistThreshold ?? 70);
  const [applicationRequirements, setApplicationRequirements] = useState(job?.application_requirements ?? '');
  const [acceptsApplications, setAcceptsApplications] = useState(job?.acceptsApplications ?? true);
  const [externalApplyUrl, setExternalApplyUrl] = useState(job?.acceptsApplications ? '' : job?.apply_url ?? '');

  const toggleCareerLevel = (level: CareerLevel) => {
    setCareerLevel((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    if (!acceptsApplications && !externalApplyUrl.trim()) {
      toast({
        title: 'Apply URL required',
        description: 'Provide an external apply link, or enable in-app applications.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
      return;
    }

    setIsSubmitting(true);
    const requiredSkills = requiredSkillsRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);

    const payload = {
      title: title.trim(),
      type,
      description: description.trim(),
      benefits: null,
      applicationRequirements: applicationRequirements.trim() || null,
      workplaceType,
      workplaceCity: workplaceCity.trim() || null,
      workplaceCountry: workplaceCountry.trim() || null,
      careerLevel,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      salaryCurrency,
      salaryUnit,
      skills: skills.trim() || null,
      requiredSkills,
      minExperienceYears: minExperienceYears ? Number(minExperienceYears) : null,
      autoShortlistThreshold,
      acceptsApplications,
      externalApplyUrl: acceptsApplications ? null : externalApplyUrl.trim(),
    };

    try {
      const res = await fetch(isEditing ? `${apiBasePath}/${job!.id}` : apiBasePath, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save job.');

      toast({ title: isEditing ? 'Job updated' : 'Job posted' });
      router.push(jobsListPath);
      router.refresh();
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="job-title">
          Job title <span className="text-red-500">*</span>
        </label>
        <Input id="job-title" onChange={(e) => setTitle(e.target.value)} required value={title} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="job-type">
            Job type
          </label>
          <select className={selectClass} id="job-type" onChange={(e) => setType(e.target.value as Job['type'])} value={type}>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="job-workplace">
            Workplace
          </label>
          <select
            className={selectClass}
            id="job-workplace"
            onChange={(e) => setWorkplaceType(e.target.value as (typeof WORKPLACE_TYPES)[number])}
            value={workplaceType}
          >
            {WORKPLACE_TYPES.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="job-city">
            City
          </label>
          <Input id="job-city" onChange={(e) => setWorkplaceCity(e.target.value)} value={workplaceCity} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="job-country">
            Country
          </label>
          <Input id="job-country" onChange={(e) => setWorkplaceCountry(e.target.value)} value={workplaceCountry} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="job-description">
          Description <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="job-description"
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={8}
          value={description}
        />
        <p className="text-xs text-zinc-400">Markdown supported.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Career level</label>
        <div className="flex flex-wrap gap-1.5">
          {CAREER_LEVELS.map((level) => (
            <button
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                careerLevel.includes(level)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
              key={level}
              onClick={() => toggleCareerLevel(level)}
              type="button"
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="salary-min">
            Salary min
          </label>
          <Input id="salary-min" onChange={(e) => setSalaryMin(e.target.value)} type="number" value={salaryMin} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="salary-max">
            Salary max
          </label>
          <Input id="salary-max" onChange={(e) => setSalaryMax(e.target.value)} type="number" value={salaryMax} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="salary-currency">
            Currency
          </label>
          <select className={selectClass} id="salary-currency" onChange={(e) => setSalaryCurrency(e.target.value)} value={salaryCurrency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="salary-unit">
            Per
          </label>
          <select
            className={selectClass}
            id="salary-unit"
            onChange={(e) => setSalaryUnit(e.target.value as (typeof SALARY_UNITS)[number])}
            value={salaryUnit}
          >
            {SALARY_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">Shortlisting criteria</h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Applications that meet these are auto-shortlisted. Also used to rank candidates in search.
        </p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="job-skills">
              Skills (shown on listing, comma-separated)
            </label>
            <Input id="job-skills" onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, Node.js" value={skills} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="required-skills">
              Required skills for auto-shortlisting (comma-separated)
            </label>
            <Input
              id="required-skills"
              onChange={(e) => setRequiredSkillsRaw(e.target.value)}
              placeholder="React, TypeScript"
              value={requiredSkillsRaw}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="min-experience">
                Min. years experience
              </label>
              <Input
                id="min-experience"
                min={0}
                onChange={(e) => setMinExperienceYears(e.target.value)}
                type="number"
                value={minExperienceYears}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="auto-shortlist-threshold">
                Auto-shortlist at match % ≥
              </label>
              <Input
                id="auto-shortlist-threshold"
                max={100}
                min={0}
                onChange={(e) => setAutoShortlistThreshold(Number(e.target.value))}
                type="number"
                value={autoShortlistThreshold}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">How candidates apply</h3>
        <div className="mt-3 flex items-center gap-2">
          <input
            checked={acceptsApplications}
            id="accepts-applications"
            onChange={(e) => setAcceptsApplications(e.target.checked)}
            type="checkbox"
          />
          <label className="text-sm text-zinc-700 dark:text-zinc-300" htmlFor="accepts-applications">
            Receive applications in-app (resume, cover letter, shortlisting)
          </label>
        </div>
        {!acceptsApplications && (
          <div className="mt-3 space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="external-apply-url">
              External apply URL <span className="text-red-500">*</span>
            </label>
            <Input
              id="external-apply-url"
              onChange={(e) => setExternalApplyUrl(e.target.value)}
              placeholder="https://yourcompany.com/careers/apply"
              value={externalApplyUrl}
            />
          </div>
        )}
        <div className="mt-3 space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="application-requirements">
            Application requirements (shown to candidates)
          </label>
          <Textarea
            id="application-requirements"
            onChange={(e) => setApplicationRequirements(e.target.value)}
            rows={2}
            value={applicationRequirements}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button disabled={isSubmitting || !title.trim() || !description.trim()} type="submit">
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Post job'}
        </Button>
        <Button disabled={isSubmitting} onClick={() => router.back()} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>

    <JobAssistantWidget
      draft={{
        title,
        description,
        type,
        workplaceType,
        workplaceCity,
        workplaceCountry,
        skills,
        requiredSkills: requiredSkillsRaw.split(',').map((s) => s.trim()).filter(Boolean),
      }}
      onApplyDescription={setDescription}
    />
    </>
  );
}
