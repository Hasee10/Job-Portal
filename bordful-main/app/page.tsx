import type { Metadata } from 'next';
import { auth } from '@/auth';
import { HomePage } from '@/components/home/HomePage';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { MarketIntelBanner } from '@/components/home/MarketIntelBanner';
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

// This page now branches on session (guest vs. signed-in seeker), so it's
// rendered per-request rather than ISR-cached - a cached HTML response
// baked from one visitor's auth() result would leak/misrepresent session
// state to every other visitor served that same cache entry. The previous
// `revalidate = 300` no longer applies now that auth() reads cookies here.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();
  const isSeeker = session?.user?.role === 'seeker';

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

  // Real fallback for the testimonials slot when there are no testimonials
  // yet, instead of an apologetic placeholder - recently posted roles,
  // which the board always has.
  const recentlyPostedJobs = [...allJobs]
    .sort(
      (a, b) =>
        new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
    )
    .slice(0, 6)
    .map((job) => ({ title: job.title, company: job.company }));

  return (
    <>
      <HomePage initialJobs={jobs} isSeeker={isSeeker} totalActiveJobs={totalActiveJobs} />
      <MarketIntelBanner />
      <HowItWorksSection />
      <TrustSection
        companiesHiringCount={companiesHiringCount}
        featuredCompanies={featuredCompanies}
        isSeeker={isSeeker}
        recentlyPostedJobs={recentlyPostedJobs}
        testimonials={testimonials}
        totalActiveJobs={totalActiveJobs}
      />
    </>
  );
}
