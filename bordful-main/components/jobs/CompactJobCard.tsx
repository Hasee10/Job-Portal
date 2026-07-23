'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { JobBadge } from '@/components/ui/job-badge';
import { formatSalary, type Job } from '@/lib/db/airtable';
import { formatDate } from '@/lib/utils/formatDate';
import { generateJobSlug } from '@/lib/utils/slugify';

export function CompactJobCard({ job }: { job: Job }) {
  const { relativeTime } = formatDate(job.posted_date);
  const showSalary =
    job.salary && (job.salary.min !== null || job.salary.max !== null);

  // Whether the job was posted within the last 48 hours, evaluated against
  // "now" - deliberately computed post-mount rather than during render.
  // This page is statically cached (revalidate = 300s), so the server's
  // "now" at generation time and the browser's "now" at hydration time can
  // differ by minutes - right at the 48h boundary that flips the "New"
  // badge on or off between server and client render, which React reports
  // as a hydration mismatch (minified error #418). Starting false and
  // flipping true in an effect always matches the server's initial render.
  const [isNew, setIsNew] = useState(false);
  useEffect(() => {
    const now = new Date();
    const postedDate = new Date(job.posted_date);
    const diffInHours = Math.floor(
      (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60)
    );
    setIsNew(diffInHours <= 48);
  }, [job.posted_date]);

  // Simplify location to just the type
  const workplaceType = job.workplace_type || '';

  // Limit title length to prevent layout issues
  const limitedTitle =
    job.title.length > 40 ? `${job.title.substring(0, 40)}...` : job.title;

  return (
    <Link
      className={`block px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
        job.featured ? 'bg-zinc-50 dark:bg-zinc-900' : ''
      }`}
      href={`/jobs/${generateJobSlug(job.title, job.company)}`}
    >
      <div className="flex items-center gap-2">
        {/* Title and badges */}
        <div className="min-w-0 flex-grow">
          <div className="flex items-center gap-1.5">
            <h3 className="line-clamp-1 max-w-[calc(100%-70px)] font-medium text-sm">
              {limitedTitle}
            </h3>
            <div className="flex shrink-0 flex-nowrap gap-1">
              {isNew && (
                <JobBadge
                  className="flex h-4 items-center px-1.5 py-0 text-[10px]"
                  type="new"
                >
                  New
                </JobBadge>
              )}
              {job.featured && (
                <JobBadge
                  className="flex h-4 items-center px-1.5 py-0 text-[9px]"
                  type="featured"
                >
                  Featured
                </JobBadge>
              )}
            </div>
          </div>

          {/* Company */}
          <div className="line-clamp-1 text-gray-600 text-xs dark:text-zinc-400">
            {job.company}
          </div>
        </div>

        {/* Essential info */}
        <div className="flex shrink-0 items-center gap-2 text-gray-500 text-xs dark:text-zinc-400">
          <span className="whitespace-nowrap">{job.type}</span>
          {showSalary && (
            <>
              <span className="text-gray-300 dark:text-zinc-600">•</span>
              <span className="whitespace-nowrap">
                {formatSalary(job.salary, true)}
              </span>
            </>
          )}
          {workplaceType && (
            <>
              <span className="text-gray-300 dark:text-zinc-600">•</span>
              <span className="whitespace-nowrap">{workplaceType}</span>
            </>
          )}
          <span className="text-gray-300 dark:text-zinc-600">•</span>
          <span className="whitespace-nowrap">{relativeTime}</span>
        </div>
      </div>
    </Link>
  );
}
