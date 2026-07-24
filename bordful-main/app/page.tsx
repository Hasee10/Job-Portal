import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';
import { TrustSection } from '@/components/home/TrustSection';
import config from '@/config';
import { HOMEPAGE_JOBS_LIMIT } from '@/lib/constants/defaults';
import { getActiveJobsCount, getJobs } from '@/lib/db/airtable.server';
import { listPublishedTestimonials } from '@/lib/content/testimonial-actions';
import { generateMetadata } from '@/lib/utils/metadata';

// Add metadata for SEO
export const metadata: Metadata = generateMetadata({
  title: config.title,
  description: config.description,
  path: '/',
  openGraph: {
    type: 'website',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: `${config.title} - ${config.description}`,
      },
    ],
  },
});

// Revalidate every 5 minutes
export const revalidate = 300;

export default async function Home() {
  const [jobs, totalActiveJobs, allJobs, testimonials] = await Promise.all([
    getJobs({ limit: HOMEPAGE_JOBS_LIMIT }),
    getActiveJobsCount(),
    getJobs(),
    listPublishedTestimonials(),
  ]);
  const companiesHiringCount = new Set(allJobs.map((job) => job.company)).size;
  // Companies with the most open roles right now - real data, not a
  // fabricated logo strip of brands that don't actually post here.
  const jobCountsByCompany = new Map<string, number>();
  for (const job of allJobs) {
    jobCountsByCompany.set(
      job.company,
      (jobCountsByCompany.get(job.company) ?? 0) + 1
    );
  }
  // A larger candidate pool than what actually displays - TrustSection
  // resolves a logo for each and only shows the ones that actually have
  // one, so this needs enough companies going in for a full-looking
  // slider to come out the other side.
  const featuredCompanies = [...jobCountsByCompany.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([company]) => company);

  return (
    <>
      <HomePage initialJobs={jobs} totalActiveJobs={totalActiveJobs} />
      <TrustSection
        companiesHiringCount={companiesHiringCount}
        featuredCompanies={featuredCompanies}
        testimonials={testimonials}
        totalActiveJobs={totalActiveJobs}
      />
    </>
  );
}
