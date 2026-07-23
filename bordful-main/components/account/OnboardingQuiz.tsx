'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { CAREER_LEVEL_DISPLAY_NAMES } from '@/lib/constants/career-levels';
import { JOB_TYPE_DISPLAY_NAMES, type JobType } from '@/lib/constants/job-types';
import type { CareerLevel } from '@/lib/db/airtable';
import type { SavedSearchFilters } from '@/lib/jobs/saved-search-matching';

// A focused subset of the full 19-value CareerLevel enum - enough to express
// intent without overwhelming a 3-question quiz.
const QUIZ_CAREER_LEVELS: CareerLevel[] = [
  'EntryLevel',
  'Junior',
  'MidLevel',
  'Senior',
  'Lead',
  'Manager',
  'Director',
  'CLevel',
];

const QUIZ_JOB_TYPES = Object.keys(JOB_TYPE_DISPLAY_NAMES) as JobType[];

const SALARY_MIN = 0;
const SALARY_MAX = 300_000;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function OnboardingQuiz({
  initialSearchTerm,
  initialFilters,
}: {
  initialSearchTerm: string;
  initialFilters: SavedSearchFilters;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [roles, setRoles] = useState<CareerLevel[]>(initialFilters.roles);
  const [types, setTypes] = useState<string[]>(initialFilters.types);
  const [remote, setRemote] = useState(initialFilters.remote);
  const [salaryRange, setSalaryRange] = useState<number[]>([
    initialFilters.salaryMin,
    initialFilters.salaryMax,
  ]);
  const [resumeStatus, setResumeStatus] = useState<
    'ready' | 'needs-work' | 'none' | null
  >(null);
  const [wantsHeadhunter, setWantsHeadhunter] = useState<boolean | null>(null);

  const steps = [
    {
      title: "What's the state of your resume?",
      content: (
        <div className="space-y-2">
          {(
            [
              { value: 'ready', label: "It's ready to go" },
              { value: 'needs-work', label: 'I have one, but it needs work' },
              { value: 'none', label: "I don't have one yet" },
            ] as const
          ).map((option) => (
            <button
              className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                resumeStatus === option.value
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
              }`}
              key={option.value}
              onClick={() => setResumeStatus(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'What role are you looking for?',
      content: (
        <div className="space-y-4">
          <Input
            className="text-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g. Product Designer, Backend Engineer"
            value={searchTerm}
          />
          <div className="flex flex-wrap gap-2">
            {QUIZ_CAREER_LEVELS.map((level) => (
              <button
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  roles.includes(level)
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                }`}
                key={level}
                onClick={() => setRoles((prev) => toggle(prev, level))}
                type="button"
              >
                {CAREER_LEVEL_DISPLAY_NAMES[level]}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'What type of work?',
      content: (
        <div className="flex flex-wrap gap-2">
          {QUIZ_JOB_TYPES.map((type) => (
            <button
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                types.includes(type)
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
              }`}
              key={type}
              onClick={() => setTypes((prev) => toggle(prev, type))}
              type="button"
            >
              {JOB_TYPE_DISPLAY_NAMES[type]}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Do you want to work remotely?',
      content: (
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
          <span className="text-sm">Remote only</span>
          <Switch checked={remote} onCheckedChange={setRemote} />
        </div>
      ),
    },
    {
      title: "What's your salary range?",
      content: (
        <div className="space-y-2">
          <span className="text-sm">
            ${(salaryRange[0] / 1000).toFixed(0)}K &ndash;{' '}
            {salaryRange[1] >= SALARY_MAX
              ? `$${(SALARY_MAX / 1000).toFixed(0)}K+`
              : `$${(salaryRange[1] / 1000).toFixed(0)}K`}
          </span>
          <Slider
            max={SALARY_MAX}
            min={SALARY_MIN}
            onValueChange={setSalaryRange}
            step={5000}
            value={salaryRange}
          />
        </div>
      ),
    },
    {
      title: 'Interested in working with a recruiter?',
      content: (
        <div className="space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Premium members can connect directly with recruiters in our
            network who specialize in their field.
          </p>
          <div className="flex gap-2">
            <button
              className={`flex-1 rounded-md border px-4 py-3 text-sm transition-colors ${
                wantsHeadhunter === true
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
              }`}
              onClick={() => setWantsHeadhunter(true)}
              type="button"
            >
              Yes, connect me
            </button>
            <button
              className={`flex-1 rounded-md border px-4 py-3 text-sm transition-colors ${
                wantsHeadhunter === false
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
              }`}
              onClick={() => setWantsHeadhunter(false)}
              type="button"
            >
              Not right now
            </button>
          </div>
        </div>
      ),
    },
    {
      title: 'Free vs. Premium',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="font-medium">Free</p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>3 saved search alerts</li>
                <li>5 AI resume tailors / month</li>
              </ul>
            </div>
            <div className="rounded-md border border-zinc-900 p-3 dark:border-zinc-100">
              <p className="font-medium">Premium</p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>20 saved search alerts</li>
                <li>Unlimited AI resume tailors</li>
                <li>Connect with recruiters</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            You&apos;re starting on the Free plan. You can upgrade any time
            from your account.
          </p>
        </div>
      ),
    },
  ];

  const isLastStep = step === steps.length - 1;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/seeker/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm: searchTerm || null,
          filters: {
            types,
            roles,
            remote,
            salaryMin: salaryRange[0],
            salaryMax: salaryRange[1],
            visa: false,
            languages: [],
            companies: [],
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to save your preferences.');

      toast({
        title: 'Preferences saved',
        description: "We'll use these to personalize your job feed.",
      });
      if (resumeStatus === 'none' || resumeStatus === 'needs-work') {
        router.push('/account/resume');
      } else if (wantsHeadhunter) {
        router.push('/recruiters');
      } else {
        router.push('/account');
      }
      router.refresh();
    } catch (error) {
      toast({
        title: 'Something went wrong',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // /account redirects here whenever onboarding isn't marked complete, so
  // skipping still has to save (with defaults) rather than just navigating
  // away - otherwise the user would land right back on this page.
  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/seeker/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm: initialSearchTerm || null,
          filters: initialFilters,
        }),
      });
      if (!response.ok) throw new Error('Failed to skip.');
      router.push('/account');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Something went wrong',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-lg border p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {steps.map((s, i) => (
            <div
              className={`h-1 flex-1 rounded-full ${
                i <= step ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
              key={s.title}
            />
          ))}
        </div>
        <button
          className="shrink-0 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          disabled={isSubmitting}
          onClick={handleSkip}
          type="button"
        >
          Skip for now
        </button>
      </div>
      <h2 className="font-semibold text-lg">{steps[step].title}</h2>
      <div className="mt-4">{steps[step].content}</div>
      <div className="mt-6 flex items-center justify-between">
        <Button
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          Back
        </Button>
        {isLastStep ? (
          <Button
            disabled={isSubmitting}
            onClick={handleFinish}
            size="sm"
            type="button"
          >
            {isSubmitting ? 'Saving...' : 'Finish'}
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)} size="sm" type="button">
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
