// Normalised shape every scraper source must produce.
// Maps 1-to-1 with the public.jobs DB columns that scrapers can populate.
export interface ScrapedJob {
  apply_url: string;
  company: string;

  // Optional — omit if the source doesn't expose the field
  description?: string;
  job_identifier: string; // the source site's own ID / slug for this job
  posted_at?: Date;
  remote_type?: "remote" | "hybrid" | "onsite"; // maps to remote_type column
  salary_currency?: string;
  salary_max?: number;
  salary_min?: number;
  salary_unit?: "hour" | "day" | "week" | "month" | "year";
  source: string; // e.g. 'mustakbil', 'naukrigulf', 'gulftalent-rss'
  // Required
  title: string;
  type?: "Full-time" | "Part-time" | "Contract" | "Freelance";
  valid_through?: string;
  workplace_city?: string;
  workplace_country?: string;
}
