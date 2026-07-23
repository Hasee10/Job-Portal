import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CompactJobCardList } from '@/components/jobs/CompactJobCardList';
import { HeroSection } from '@/components/ui/hero-section';
import { MetadataBreadcrumb } from '@/components/ui/metadata-breadcrumb';
import config from '@/config';
import { LATEST_JOBS_COUNT } from '@/lib/constants/defaults';
import { getJobs } from '@/lib/db/airtable.server';

// Add metadata for SEO
export const metadata: Metadata = {
  title: 'Job Alerts | Get Notified of New Opportunities',
  description:
    config.jobAlerts.form?.description ||
    'Subscribe to job alerts and get notified when new opportunities are posted.',
  keywords:
    'job alerts, job notifications, career alerts, employment updates, job subscription',
  openGraph: {
    title: 'Job Alerts | Get Notified of New Opportunities',
    description:
      config.jobAlerts.form?.description ||
      'Subscribe to job alerts and get notified when new opportunities are posted.',
    type: 'website',
    url: `${config.url}/job-alerts`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Alerts | Get Notified of New Opportunities',
    description:
      config.jobAlerts.form?.description ||
      'Subscribe to job alerts and get notified when new opportunities are posted.',
  },
  alternates: {
    canonical: `${config.url}/job-alerts`,
    languages: {
      en: `${config.url}/job-alerts`,
      'x-default': `${config.url}/job-alerts`,
    },
  },
};

// Revalidate every 5 minutes
export const revalidate = 300;

export default async function JobAlertsPage() {
  // Redirect to home page if job alerts feature is disabled
  if (!config.jobAlerts?.enabled) {
    redirect('/');
  }

  // Fetch the latest jobs
  const allJobs = await getJobs();
  const latestJobs = allJobs.slice(0, LATEST_JOBS_COUNT); // Show latest jobs

  return (
    <main className="min-h-screen bg-background">
      <HeroSection
        badge={config.jobAlerts.hero?.badge || 'Job Alerts'}
        description={
          config.jobAlerts.hero?.description ||
          'Subscribe to job alerts and get notified when new opportunities are posted.'
        }
        heroImage={config.jobAlerts.heroImage}
        title={config.jobAlerts.hero?.title || 'Get Jobs Right to Your Inbox'}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <MetadataBreadcrumb metadata={metadata} pathname="/job-alerts" />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Sign in + saved search alerts - the newsletter-style signup
              form here was disabled (it depended on an email marketing
              provider that isn't set up), but seekers already have a real,
              working alerts mechanism: save a search from the homepage and
              the daily/6-hourly cron emails matching new listings. Point
              here instead of showing a dead form. */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 font-semibold text-xl">Get job alerts</h2>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Sign in, save a search with the filters you care about, and
              we&apos;ll email you when matching jobs are posted.
            </p>
            <Link
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 font-medium text-sm text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              href="/account/sign-in?callbackUrl=/"
            >
              Sign in to set up alerts
            </Link>
          </div>

          {/* Latest jobs */}
          <div className="lg:col-span-2">
            <CompactJobCardList className="bg-background" jobs={latestJobs} />
          </div>
        </div>
      </div>
    </main>
  );
}
