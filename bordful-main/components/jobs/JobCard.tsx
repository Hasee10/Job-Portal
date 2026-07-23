import { ArrowUpRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SaveJobButton } from '@/components/jobs/SaveJobButton';
import { Button } from '@/components/ui/button';
import { JobBadge } from '@/components/ui/job-badge';
import config from '@/config';
import { formatSalary, type Job } from '@/lib/db/airtable';
import { resolveColor } from '@/lib/utils/colors';
import { formatDate } from '@/lib/utils/formatDate';
import { generateJobSlug } from '@/lib/utils/slugify';

export function JobCard({ job }: { job: Job }) {
  const { fullDate, relativeTime } = formatDate(job.posted_date);
  const showSalary =
    job.salary && (job.salary.min !== null || job.salary.max !== null);

  // Format location based on workplace type
  const location =
    job.workplace_type === 'Remote'
      ? job.remote_region
        ? `Remote (${job.remote_region})`
        : null
      : job.workplace_type === 'Hybrid'
        ? [
            job.workplace_city,
            job.workplace_country,
            job.remote_region ? `Hybrid (${job.remote_region})` : null,
          ]
            .filter(Boolean)
            .join(', ') || null
        : [job.workplace_city, job.workplace_country]
            .filter(Boolean)
            .join(', ') || null;

  // Whether the job is "New" (<=48h) / "very new" (<=24h, for the "Be an
  // early applicant" highlight badge) - deliberately computed post-mount
  // rather than during render. This page is statically cached (revalidate
  // = 300s), so the server's "now" at generation time and the browser's
  // "now" at hydration time can differ by minutes - right at either
  // boundary that flips a badge on or off between server and client
  // render, which React reports as a hydration mismatch (minified error
  // #418). Starting both false and flipping in an effect always matches
  // the server's initial render.
  const [isNew, setIsNew] = useState(false);
  const [isVeryNew, setIsVeryNew] = useState(false);
  useEffect(() => {
    const diffInHours = Math.floor(
      (new Date().getTime() - new Date(job.posted_date).getTime()) /
        (1000 * 60 * 60)
    );
    setIsNew(diffInHours <= 48);
    setIsVeryNew(diffInHours <= 24);
  }, [job.posted_date]);

  // Derived from real listing fields, not AI-generated copy - "early
  // applicant" is a stricter/earlier window than the "New" badge (24h vs
  // 48h) so the two don't just duplicate each other on the same card.
  const highlightBadges = [
    showSalary ? 'Competitive salary' : null,
    job.workplace_type === 'Remote' ? 'Remote' : null,
    isVeryNew ? 'Be an early applicant' : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <div className="group relative">
      <Link
        className={`block rounded-lg border p-4 transition-all sm:p-5 ${
          job.featured
            ? 'bg-zinc-100 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800'
            : 'hover:border-gray-400 dark:hover:border-zinc-600'
        }`}
        href={`/jobs/${generateJobSlug(job.title, job.company)}`}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex max-w-full flex-wrap items-center gap-2">
              <h2 className="line-clamp-2 font-medium text-base">
                {job.title}
              </h2>
              {isNew && <JobBadge type="new">New</JobBadge>}
            </div>
            {job.featured && (
              <JobBadge
                className="shrink-0"
                icon={<Sparkles className="h-3 w-3" />}
                type="featured"
              >
                Featured
              </JobBadge>
            )}
          </div>
          <div className="text-gray-600 text-sm dark:text-zinc-400">
            {job.company}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-500 text-xs dark:text-zinc-400">
            <span className="whitespace-nowrap">{job.type}</span>
            {showSalary && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">
                  {formatSalary(job.salary, true)}
                </span>
              </>
            )}
            {location && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">{location}</span>
              </>
            )}
            <span>•</span>
            <time className="whitespace-nowrap" dateTime={job.posted_date}>
              {fullDate} ({relativeTime})
            </time>
          </div>
          {highlightBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {highlightBadges.map((label) => (
                <JobBadge key={label} type="default">
                  {label}
                </JobBadge>
              ))}
            </div>
          )}
        </div>
      </Link>
      <div className="absolute top-4 right-4 sm:top-auto sm:bottom-4 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <SaveJobButton jobId={job.id} />
      </div>
      {job.apply_url && (
        <div className="absolute right-14 bottom-4 hidden opacity-0 transition-opacity group-hover:opacity-100 sm:block">
          <Button
            asChild
            className="gap-1.5 text-xs"
            size="xs"
            style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
            variant="primary"
          >
            <a
              href={job.apply_url}
              onClick={(e) => e.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
            >
              Apply Now
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
