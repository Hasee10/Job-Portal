import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { GenerateResumeButton } from "@/components/jobs/GenerateResumeButton";
import { JobApplicationActions } from "@/components/jobs/JobApplicationActions";
import { JobFitBadge } from "@/components/jobs/JobFitBadge";
import { SaveJobButton } from "@/components/jobs/SaveJobButton";
import { ClientBreadcrumb } from "@/components/ui/client-breadcrumb";
import { JobDetailsSidebar } from "@/components/ui/job-details-sidebar";
import { JobSchema } from "@/components/ui/job-schema";
import { PostJobBanner } from "@/components/ui/post-job-banner";
import { SimilarJobs } from "@/components/ui/similar-jobs";
import config from "@/config";
import {
  PARENTHESIS_CONTENT_REGEX,
  STATIC_JOB_PAGES_LIMIT,
} from "@/lib/constants/defaults";
import { formatSalary } from "@/lib/db/jobs";
import { getJob, getJobs } from "@/lib/db/jobs.server";
import { formatDate } from "@/lib/utils/formatDate";
import { generateMetadata as createMetadata } from "@/lib/utils/metadata";
import { generateJobSlug } from "@/lib/utils/slugify";

// Constants for checkbox text extraction
const CHECKBOX_MARKER_LENGTH = 4;

// Regex constants for performance
const FINAL_WORD_REGEX = /(\w)$/;
const TAG_SPLIT_REGEX = /[,;\n]+/;
const LEADING_DESCRIPTION_HEADING = /^#{1,2}\s+([^\n]+)\n+/;

// Job data stores skills/education/experience as free-text strings (comma,
// semicolon, or newline separated) - split into discrete tags for display.
function splitTags(value: string): string[] {
  return value
    .split(TAG_SPLIT_REGEX)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// Pre-render only the most recent jobs at build time (see
// STATIC_JOB_PAGES_LIMIT) - dynamicParams defaults to true, so every other
// active job still renders correctly on first visit and gets cached via
// this page's `revalidate` setting below.
export async function generateStaticParams() {
  const jobs = await getJobs({ limit: STATIC_JOB_PAGES_LIMIT });
  // getJobs already filters for active jobs, but we'll explicitly filter here for clarity
  return jobs
    .filter((job) => job.status === "active")
    .map((job) => ({
      slug: generateJobSlug(job.title, job.company),
    }));
}

// Generate metadata for the job page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // getJobs() returns lite rows (no description/benefits) - fine for
  // locating the slug match, but metadata needs the real description below.
  const [allJobs, { slug }] = await Promise.all([getJobs(), params]);

  // Find the job with matching slug
  const liteJob = allJobs.find((j) => {
    const jobSlug = generateJobSlug(j.title, j.company);
    return jobSlug === slug;
  });

  const job = liteJob ? await getJob(liteJob.id) : null;

  if (!job) {
    return {
      description: "The job you're looking for could not be found.",
      title: `Job Not Found | ${config.title}`,
    };
  }

  // Format location for metadata based on workplace type
  const metaLocation = (() => {
    // For Remote jobs, show the region if available
    if (job.workplace_type === "Remote") {
      if (!job.remote_region) {
        return "Remote position (Worldwide)";
      }

      // For Worldwide specifically, don't use "in"
      if (job.remote_region === "Worldwide") {
        return "Remote position (Worldwide)";
      }

      // For other regions, use "in"
      return `Remote position in ${job.remote_region}`;
    }

    // For Hybrid jobs, show the location with Hybrid prefix
    if (job.workplace_type === "Hybrid") {
      const location = [job.workplace_city, job.workplace_country]
        .filter(Boolean)
        .join(", ");
      return location ? `Hybrid position in ${location}` : "Hybrid position";
    }

    // For On-site jobs, show the location directly
    if (job.workplace_type === "On-site") {
      const location = [job.workplace_city, job.workplace_country]
        .filter(Boolean)
        .join(", ");
      return location ? `in ${location}` : "";
    }

    // Default case (Not specified)
    return "";
  })();

  // Format deadline if available
  const deadlineText = (() => {
    if (!job.valid_through) {
      return "Apply now";
    }

    const deadline = new Date(job.valid_through);
    if (Number.isNaN(deadline.getTime())) {
      return "Apply now";
    }

    return `Apply before ${deadline.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  })();

  // Build description parts dynamically
  const parts: string[] = [];

  // First part - company, job type and title (removing parentheses if present in the title)
  const cleanTitle = job.title.replace(PARENTHESIS_CONTENT_REGEX, " ").trim();

  // Base description
  let baseDescription = `${job.company} is hiring ${
    job.type ? job.type.toLowerCase() : ""
  } ${cleanTitle}`.trim();
  let baseDescriptionAdded = false;

  // Add location only if it exists
  if (metaLocation) {
    // For "in X" format, append directly; for other formats, add as new sentence
    if (metaLocation.startsWith("in ")) {
      baseDescription += ` ${metaLocation}`;
    } else {
      parts.push(baseDescription);
      parts.push(metaLocation);
      baseDescriptionAdded = true;
    }
  }

  // Add the base description if it wasn't added already
  if (!baseDescriptionAdded) {
    parts.push(baseDescription);
  }

  // Salary
  if (job.salary) {
    parts.push(`Salary: ${formatSalary(job.salary, true)}`);
  }

  // Deadline
  parts.push(deadlineText);

  // Use our utility to generate consistent metadata
  // Join with periods and ensure proper formatting
  const description = parts
    .join(". ")
    // Fix any double periods
    .replace(/\.\./g, ".")
    // Ensure there's a period at the end
    .replace(FINAL_WORD_REGEX, "$1.");

  return createMetadata({
    description,
    openGraph: {
      images: [
        {
          alt: `${job.title} at ${job.company}`,
          height: 630,
          url: `/api/og/jobs/${slug}`,
          width: 1200,
        },
      ],
      type: "article",
    },
    path: `/jobs/${slug}`,
    title: `${job.title} at ${job.company}`,
  });
}

// Revalidate page every 5 minutes (300 seconds) instead of forcing dynamic rendering
export const revalidate = 300;

export default async function JobPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [jobs, { slug }] = await Promise.all([getJobs(), params]);
  const liteJob = jobs.find(
    (j) => generateJobSlug(j.title, j.company) === slug
  );

  if (!liteJob) {
    notFound();
  }

  // getJobs() above returns lite rows (no description/benefits/etc, see
  // JOBS_LIST_COLUMNS in airtable.server.ts) - only good enough to locate
  // the slug match. Fetch the real row for everything this page renders.
  const job = await getJob(liteJob.id);

  if (!job) {
    notFound();
  }

  // Return 404 for inactive jobs as per Google's structured data guidelines
  if (job.status !== "active") {
    notFound();
  }

  const description = job.description.replace(
    LEADING_DESCRIPTION_HEADING,
    (heading, title: string) =>
      title.trim().toLowerCase() === job.title.trim().toLowerCase()
        ? ""
        : heading
  );
  const { fullDate, relativeTime } = formatDate(job.posted_date);
  const showSalary =
    job.salary && (job.salary.min !== null || job.salary.max !== null);

  // Format location based on workplace type
  let location: string | null = null;

  if (job.workplace_type === "Remote") {
    location = job.remote_region ? `Remote (${job.remote_region})` : null;
  } else if (job.workplace_type === "Hybrid") {
    const hybridParts = [
      job.workplace_city,
      job.workplace_country,
      job.remote_region ? `Hybrid (${job.remote_region})` : null,
    ].filter(Boolean);

    location = hybridParts.length > 0 ? hybridParts.join(", ") : null;
  } else {
    // On-site or other types
    const onsiteParts = [job.workplace_city, job.workplace_country].filter(
      Boolean
    );
    location = onsiteParts.length > 0 ? onsiteParts.join(", ") : null;
  }

  return (
    <main className="bg-muted/20 py-8 sm:py-10">
      <div className="container mx-auto max-w-6xl px-4">
        <JobSchema job={job} slug={slug} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main content */}
          <article className="min-w-0">
            <div className="mb-6">
              <ClientBreadcrumb
                dynamicData={{
                  name: job.title,
                  url: `/jobs/${slug}`,
                }}
              />
            </div>
            <div className="mb-6 rounded-2xl border bg-card p-6 sm:p-8">
              <div className="space-y-4">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
                  CAREER OPPORTUNITY
                </p>
                <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
                  {job.title}
                </h1>
                <div className="text-base text-gray-600 dark:text-zinc-400">
                  {job.company}
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-lg border bg-muted/30 px-3 py-1.5">
                    {job.type}
                  </span>
                  {showSalary && (
                    <span className="rounded-lg border bg-muted/30 px-3 py-1.5">
                      {formatSalary(job.salary, true)}
                    </span>
                  )}
                  {location && (
                    <span className="rounded-lg border bg-muted/30 px-3 py-1.5">
                      {location}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <p className="text-muted-foreground text-xs">
                    Posted {relativeTime}
                  </p>
                  <SaveJobButton jobId={job.id} />
                </div>
                <div className="lg:hidden">
                  <ApplyButton
                    acceptsApplications={Boolean(job.accepts_applications)}
                    applyUrl={job.apply_url}
                    jobId={job.id}
                    jobTitle={job.title}
                    size="default"
                    fullWidth
                  />
                </div>
                <JobFitBadge jobId={job.id} />
              </div>
            </div>

            <section className="rounded-2xl border bg-card p-6 sm:p-8">
              <h2 className="font-semibold text-xl">About this role</h2>
              <div className="prose prose-sm prose-gray mt-5 max-w-none dark:prose-invert">
                <div className="markdown-content [&_a:hover]:text-zinc-800 [&_a]:text-zinc-900 [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors dark:[&_a]:text-primary">
                  {!job.description && (
                    <p className="text-red-500">No description available</p>
                  )}
                  {/* Use our custom utility to process Airtable's markdown format */}
                  <ReactMarkdown
                    components={{
                      // Style links
                      a: ({ href, ...props }) =>
                        href ? (
                          <a
                            className="text-primary hover:text-primary/80"
                            href={href}
                            rel="noopener noreferrer"
                            target="_blank"
                            {...props}
                          />
                        ) : (
                          <span className="text-primary" {...props} />
                        ),
                      // Style blockquotes (for Airtable quote blocks)
                      blockquote: ({ ...props }) => (
                        <blockquote
                          className="my-4 border-gray-200 border-l-4 pl-4 italic"
                          {...props}
                        />
                      ),
                      // Style code blocks
                      code: ({ className, children, ...props }) => {
                        // Inline code typically has no language class
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code
                              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                        // Block code
                        return (
                          <pre className="my-4 overflow-x-auto rounded-md bg-gray-100 p-4">
                            <code className="font-mono text-sm" {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      },
                      // Customize heading styles - consistent with the rest of the app
                      h1: ({ ...props }) => (
                        <h2
                          className="mb-2 font-semibold text-2xl"
                          {...props}
                        />
                      ),
                      h2: ({ ...props }) => (
                        <h2 className="mb-2 font-semibold text-xl" {...props} />
                      ),
                      h3: ({ ...props }) => (
                        <h3 className="mb-2 font-semibold text-lg" {...props} />
                      ),
                      h4: ({ ...props }) => (
                        <h4
                          className="mb-2 font-semibold text-base"
                          {...props}
                        />
                      ),
                      // Style checkboxes for Airtable's checkbox format and improve list item handling
                      li: ({ children, className, ...props }) => {
                        // Check if this is a checkbox item
                        if (
                          typeof children === "string" &&
                          (children.startsWith("[x] ") ||
                            children.startsWith("[ ] "))
                        ) {
                          const checkedBox = children.startsWith("[x] ");
                          const text = children.substring(
                            CHECKBOX_MARKER_LENGTH
                          );
                          return (
                            <li
                              className="my-1 flex items-start gap-2"
                              {...props}
                            >
                              <input
                                checked={checkedBox}
                                className="mt-1"
                                readOnly
                                type="checkbox"
                              />
                              <span>{text}</span>
                            </li>
                          );
                        }

                        // Check if this is a bold list item (like "**Lifecycle Marketing**")
                        // This is a special case for job descriptions with bold list headers
                        const isBoldListItem =
                          typeof children === "object" &&
                          React.isValidElement(children) &&
                          children.type === "strong";

                        if (isBoldListItem) {
                          return (
                            <li className="my-2 font-semibold" {...props}>
                              {children}
                            </li>
                          );
                        }

                        // Default list item
                        const listItemClass = className || "";
                        // Use standard padding for list items
                        const spacingClass = "pl-1";

                        return (
                          <li
                            className={`${listItemClass} ${spacingClass} my-1`}
                            {...props}
                          >
                            {children}
                          </li>
                        );
                      },
                      ol: ({ className, ...props }) => (
                        <ol
                          className={`my-2 ml-4 list-decimal ${className || ""}`}
                          {...props}
                        />
                      ),
                      // Style paragraphs
                      p: ({ ...props }) => (
                        <p className="my-3 leading-7" {...props} />
                      ),
                      // Style lists with better nesting support
                      ul: ({ className, ...props }) => {
                        // Always indent top-level lists; nested lists get natural browser indent
                        return (
                          <ul
                            className={`my-2 ml-4 list-disc ${className || ""}`}
                            {...props}
                          />
                        );
                      },
                    }}
                    remarkPlugins={[remarkGfm]}
                  >
                    {description}
                  </ReactMarkdown>
                  {/^.*[…]$|\.\.\.\s*$/.test(job.description.trim()) &&
                    job.apply_url && (
                      <p className="not-prose mt-4 text-gray-500 text-sm">
                        This listing was imported from{" "}
                        {job.job_source_name || "an external source"} and only
                        includes a partial description.{" "}
                        <a
                          className="text-primary hover:text-primary/80"
                          href={job.apply_url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Read the full posting on the original site
                        </a>
                        .
                      </p>
                    )}
                </div>
              </div>
            </section>

            {/* Structured skills/education/experience blocks, when the job data has them */}
            {(job.skills ||
              job.education_requirements ||
              job.experience_requirements) && (
              <div className="mt-6 space-y-5 rounded-2xl border bg-card p-6 sm:p-8">
                <h2 className="font-semibold text-xl">
                  Skills and qualifications
                </h2>
                {job.skills && (
                  <div>
                    <h3 className="mb-2 font-semibold text-sm">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {splitTags(job.skills).map((tag) => (
                        <span
                          className="rounded-full border bg-gray-50 px-2.5 py-1 text-gray-700 text-xs dark:bg-zinc-800 dark:text-zinc-300"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {job.education_requirements && (
                  <div>
                    <h3 className="mb-2 font-semibold text-sm">Education</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {splitTags(job.education_requirements).map((tag) => (
                        <span
                          className="rounded-full border bg-gray-50 px-2.5 py-1 text-gray-700 text-xs dark:bg-zinc-800 dark:text-zinc-300"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {job.experience_requirements && (
                  <div>
                    <h3 className="mb-2 font-semibold text-sm">Experience</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {splitTags(job.experience_requirements).map((tag) => (
                        <span
                          className="rounded-full border bg-gray-50 px-2.5 py-1 text-gray-700 text-xs dark:bg-zinc-800 dark:text-zinc-300"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Application Requirements - Prominently displayed before apply button */}
            {job.application_requirements && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <h3 className="mb-1.5 flex items-center gap-1 font-semibold text-xs">
                  <ClipboardList className="h-3.5 w-3.5 text-amber-600" />
                  Application Requirements
                </h3>
                <p className="text-amber-950 text-sm dark:text-amber-100">
                  {job.application_requirements}
                </p>
              </div>
            )}

            <section className="mt-6 rounded-2xl border bg-card p-6">
              <h2 className="font-semibold text-lg">Track this opportunity</h2>
              <p className="mt-2 mb-4 text-muted-foreground text-sm">
                Keep your application status organized as your search
                progresses.
              </p>
              <JobApplicationActions jobId={job.id} />
            </section>
          </article>

          {/* Sidebar */}
          <aside className="min-w-0 space-y-6">
            <section className="rounded-2xl border bg-card p-6">
              <h2 className="font-semibold text-lg">Take the next step</h2>
              <p className="mt-2 mb-5 text-muted-foreground text-sm leading-relaxed">
                Review the role and prepare your application.
              </p>
              <ApplyButton
                acceptsApplications={Boolean(job.accepts_applications)}
                applyUrl={job.apply_url}
                jobId={job.id}
                jobTitle={job.title}
                size="default"
                fullWidth
              />
              <div className="mt-3 [&>button]:h-10 [&>button]:w-full">
                <GenerateResumeButton
                  jobCompany={job.company}
                  jobId={job.id}
                  jobSlug={slug}
                  jobTitle={job.title}
                />
              </div>
              <dl className="mt-6 space-y-4 border-t pt-5 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Date posted</dt>
                  <dd className="mt-1">{fullDate}</dd>
                </div>
                {job.valid_through && (
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      Application deadline
                    </dt>
                    <dd className="mt-1">
                      {new Date(job.valid_through).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground text-xs">Workplace</dt>
                  <dd className="mt-1">{location || job.workplace_type}</dd>
                </div>
              </dl>
            </section>
            <details className="rounded-2xl border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-sm">
                More job details
              </summary>
              <div className="mt-5">
                {/* Job Details - Always show first in sidebar */}
                <JobDetailsSidebar
                  apply_url={job.apply_url}
                  benefits={job.benefits}
                  career_level={job.career_level}
                  fullDate={fullDate}
                  job_identifier={job.job_identifier || null}
                  job_source_name={job.job_source_name || null}
                  jobUrl={`${config.url}/jobs/${slug}`}
                  languages={job.languages}
                  relativeTime={relativeTime}
                  remote_region={job.remote_region}
                  salary={job.salary}
                  timezone_requirements={job.timezone_requirements}
                  title={job.title}
                  valid_through={job.valid_through || null}
                  visa_sponsorship={job.visa_sponsorship}
                  workplace_city={job.workplace_city}
                  workplace_country={job.workplace_country}
                  workplace_type={job.workplace_type}
                />
              </div>
            </details>

            {/* On mobile, Similar Jobs appear before Post Job Banner */}
            <div className="rounded-2xl border bg-card p-5">
              <SimilarJobs allJobs={jobs} currentJob={job} />
            </div>
            <div className="md:order-2">
              <PostJobBanner />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
