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

  return (
    <>
      <HomePage initialJobs={jobs} totalActiveJobs={totalActiveJobs} />
      <TrustSection
        companiesHiringCount={companiesHiringCount}
        testimonials={testimonials}
      />
    </>
  );
}
