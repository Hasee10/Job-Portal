import type { MetadataRoute } from "next";
import { getJobs } from "@/lib/db/jobs.server";
import { generateJobSlug } from "@/lib/utils/slugify";

/**
 * Generate the sitemap for the website
 * This function runs at build time and creates a sitemap for all your pages
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get the base URL from environment variable or default to localhost
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Define your static routes
  const staticRoutes = [
    {
      changeFrequency: "daily",
      lastModified: new Date(),
      priority: 1,
      url: baseUrl,
    },
    {
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0.8,
      url: `${baseUrl}/about`,
    },
    {
      changeFrequency: "daily",
      lastModified: new Date(),
      priority: 0.8,
      url: `${baseUrl}/jobs`,
    },
    {
      changeFrequency: "monthly",
      lastModified: new Date(),
      priority: 0.5,
      url: `${baseUrl}/privacy`,
    },
    {
      changeFrequency: "monthly",
      lastModified: new Date(),
      priority: 0.5,
      url: `${baseUrl}/terms`,
    },
    {
      changeFrequency: "monthly",
      lastModified: new Date(),
      priority: 0.5,
      url: `${baseUrl}/cookies`,
    },
    {
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0.6,
      url: `${baseUrl}/changelog`,
    },
    {
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0.7,
      url: `${baseUrl}/faq`,
    },
  ] as MetadataRoute.Sitemap;

  try {
    // Fetch all active jobs
    const jobs = await getJobs();

    // Create sitemap entries for each job using descriptive slugs
    const jobRoutes = jobs
      .filter(
        (job) =>
          job.posted_date && !Number.isNaN(new Date(job.posted_date).getTime())
      )
      .map((job) => ({
        changeFrequency: "daily" as const,
        lastModified: new Date(job.posted_date),
        priority: job.featured ? 0.9 : 0.7,
        url: `${baseUrl}/jobs/${generateJobSlug(job.title, job.company)}`,
      }));

    // Create sitemap entries for job category pages
    const uniqueTypes = [
      ...new Set(jobs.map((job) => job.type).filter(Boolean)),
    ];
    const typeRoutes = uniqueTypes.map((type) => ({
      changeFrequency: "daily" as const,
      lastModified: new Date(),
      priority: 0.6,
      url: `${baseUrl}/jobs/type/${type.toLowerCase().replace(/\s+/g, "-")}`,
    }));

    // Create sitemap entries for career level pages
    const uniqueLevels = [
      ...new Set(jobs.flatMap((job) => job.career_level).filter(Boolean)),
    ];
    const levelRoutes = uniqueLevels.map((level) => ({
      changeFrequency: "daily" as const,
      lastModified: new Date(),
      priority: 0.6,
      url: `${baseUrl}/jobs/level/${level.toLowerCase()}`,
    }));

    // Create sitemap entries for location pages
    const locations = jobs.reduce((acc, job) => {
      if (job.workplace_type === "Remote" && !acc.includes("remote")) {
        acc.push("remote");
      }
      if (job.workplace_country && !acc.includes(job.workplace_country)) {
        acc.push(job.workplace_country);
      }
      return acc;
    }, [] as string[]);

    const locationRoutes = locations.map((location) => ({
      changeFrequency: "daily" as const,
      lastModified: new Date(),
      priority: 0.6,
      url: `${baseUrl}/jobs/location/${location
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
    }));

    // Combine all routes
    return [
      ...staticRoutes,
      ...jobRoutes,
      ...typeRoutes,
      ...levelRoutes,
      ...locationRoutes,
    ];
  } catch (_error) {
    // Return static routes if there's an error fetching jobs
    return staticRoutes;
  }
}
