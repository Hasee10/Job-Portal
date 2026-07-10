// Normalised shape every scraper source must produce.
// Maps 1-to-1 with the public.jobs DB columns that scrapers can populate.
export interface ScrapedJob {
  // Required
  title: string;
  company: string;
  apply_url: string;
  source: string;        // e.g. 'mustakbil', 'naukrigulf', 'gulftalent-rss'
  job_identifier: string; // the source site's own ID / slug for this job

  // Optional — omit if the source doesn't expose the field
  description?: string;
  type?: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance';
  remote_type?: 'remote' | 'hybrid' | 'onsite'; // maps to remote_type column
  workplace_city?: string;
  workplace_country?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_unit?: 'hour' | 'day' | 'week' | 'month' | 'year';
  posted_at?: Date;
  valid_through?: string;
}
