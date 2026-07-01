---
title: Sitemap Generation
description: Learn how Bordful automatically generates a comprehensive XML sitemap to improve your job board's search engine visibility.
lastUpdated: "2025-05-22"
---

# Sitemap Generation

Bordful automatically generates a comprehensive XML sitemap at `/sitemap.xml` that enhances your job board's visibility to search engines. This feature is a key component of Bordful's SEO optimization toolkit.

## Overview

A sitemap is an XML file that provides search engines with information about the pages, videos, and other files on your site, and the relationships between them. Search engines like Google read this file to crawl your site more efficiently. Bordful implements sitemap generation using Next.js's built-in Metadata API for a type-safe and maintainable approach.

## Structure

The automatically generated sitemap includes:

- Homepage and static pages (about, contact, FAQ, etc.)
- Individual job listings with descriptive, SEO-friendly URLs
- Job category pages (types, levels, locations, languages)
- All entries include proper priorities and change frequencies

## Key Features

### SEO-Friendly URLs

Bordful generates descriptive slugs for job listings that include relevant information for both users and search engines:

- Example: `/jobs/senior-developer-at-company-name`
- Format: `{job-level}-{job-title}-at-{company-name}`
- Special characters are properly handled and normalized
- URLs are human-readable and keyword-rich

### Dynamic Updates

The sitemap is dynamically generated and updated:

- Automatically includes new jobs through Incremental Static Regeneration (ISR)
- Removes expired or inactive job listings
- Updates modified job details
- No manual rebuilds required after content changes

### Priority Levels

Bordful implements intelligent priority levels to help search engines understand the importance of different pages:

| Page Type      | Priority | Rationale                                     |
| -------------- | -------- | --------------------------------------------- |
| Homepage       | 1.0      | Main entry point to the job board             |
| Featured Jobs  | 0.9      | High-value content that should be prioritized |
| Regular Jobs   | 0.7      | Standard priority for job listings            |
| Category Pages | 0.6      | Supporting pages that organize content        |
| Static Pages   | 0.5      | Informational pages with lower priority       |

### Change Frequencies

Each URL in the sitemap includes an appropriate change frequency:

| Page Type           | Change Frequency | Rationale                                  |
| ------------------- | ---------------- | ------------------------------------------ |
| Job Listings        | daily            | Job content may be updated frequently      |
| Category Pages      | daily            | New jobs may be added to categories daily  |
| Homepage            | daily            | Featured jobs and counts change frequently |
| Informational Pages | weekly/monthly   | Content changes less frequently            |

## Implementation

The sitemap is generated using Next.js's built-in Metadata API in `app/sitemap.ts`:

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import config from '@/config';
import { getAllJobs } from '@/lib/db/airtable';
import { getJobTypes, getCareerLevels, getLocations, getLanguages } from '@/lib/utils/filters';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = config.url;
  const jobs = await getAllJobs();
  const activeJobs = jobs.filter(job => job.status === 'active');
  
  // Base static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    // Other static pages...
  ];
  
  // Individual job pages
  const jobPages = activeJobs.map(job => ({
    url: `${baseUrl}/jobs/${job.slug}`,
    lastModified: new Date(job.modifiedTime || job.postedDate),
    changeFrequency: 'daily' as const,
    priority: job.featured ? 0.9 : 0.7,
  }));
  
  // Category pages (types, levels, locations, languages)
  const jobTypes = getJobTypes(activeJobs);
  const typePages = jobTypes.map(type => ({
    url: `${baseUrl}/jobs/type/${type.toLowerCase().replace(' ', '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));
  
  // Similar mapping for career levels, locations, and languages...
  
  return [...staticPages, ...jobPages, ...typePages, /* ...other category pages */];
}
```

## Configuration

### 1. Setting Your Production URL

Ensure your production URL is properly set in your environment:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Alternatively, you can set it in your `config/config.ts` file:

```typescript
export const config = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com',
  // other config options...
}
```

### 2. Accessing Your Sitemap

Once deployed, your sitemap will be available at:

```
https://yourdomain.com/sitemap.xml
```

### 3. Submitting to Search Engines

For maximum SEO benefit, submit your sitemap to search engines:

1. **Google Search Console**:
   - Add your property and verify ownership
   - Navigate to "Sitemaps" section
   - Enter `sitemap.xml` and submit

2. **Bing Webmaster Tools**:
   - Add your site and verify ownership
   - Navigate to "Sitemaps" section
   - Submit your sitemap URL

3. **Other Search Engines**:
   - Yahoo (uses Bing's index)
   - Yandex Webmaster
   - Baidu Webmaster Tools (for Chinese market)

## Automatic Updates

One of the key benefits of Bordful's sitemap implementation is that it requires no maintenance:

- **Real-time Updates**: The sitemap is dynamically regenerated with the latest content
- **Incremental Static Regeneration**: Uses Next.js ISR for efficient updates
- **Revalidation Period**: Content refreshes every 5 minutes by default
- **Zero Downtime**: Updates happen without interrupting site availability

## Advanced Customization

### Modifying Priority Levels

If you want to adjust the priority levels for different page types, you can modify the `app/sitemap.ts` file:

```typescript
// Customize priority levels
const staticPages = [
  {
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.95, // Adjusted from 1.0
  },
  // Other pages...
];
```

### Custom Sitemap Structure

You can customize the sitemap structure by modifying the generation logic in `app/sitemap.ts`. For example, you might want to:

- Add additional page types
- Group jobs by industry or department
- Create separate sitemaps for different sections of your site

### Multiple Sitemaps

For larger job boards, you might want to implement a sitemap index with multiple child sitemaps:

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // For very large job boards, you might implement a sitemap index
  if (config.useSitemapIndex) {
    return [
      {
        url: `${baseUrl}/sitemaps/static.xml`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/sitemaps/jobs.xml`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/sitemaps/categories.xml`,
        lastModified: new Date(),
      },
    ];
  }
  
  // Standard sitemap generation for smaller sites
  return [...staticPages, ...jobPages, ...categoryPages];
}
```

## Common Issues and Solutions

### Problem: Sitemap Not Updating

If your sitemap isn't updating with new content:

1. **Check ISR Configuration**: Ensure your revalidation period is set correctly
2. **Verify Job Status**: Only active jobs should appear in the sitemap
3. **Check URL Configuration**: Ensure your baseUrl is correctly set
4. **Force Revalidation**: You can manually trigger revalidation using Next.js's on-demand revalidation API

### Problem: Inconsistent URLs

Ensure that all URLs in your sitemap follow the same format:

```typescript
// ❌ Mixed URL formats
const mixedUrls = [
  { url: 'https://example.com/page1', ... },
  { url: 'https://www.example.com/page2', ... },  // Different domain format
  { url: '/page3', ... },  // Relative URL (invalid in sitemaps)
];

// ✅ Consistent URL format
const consistentUrls = [
  { url: 'https://example.com/page1', ... },
  { url: 'https://example.com/page2', ... },
  { url: 'https://example.com/page3', ... },
];
```

### Problem: Too Many URLs

If your job board grows very large (thousands of jobs), consider implementing a sitemap index:

1. Create separate sitemap files for different sections
2. Implement a sitemap index file that links to these individual sitemaps
3. Submit the sitemap index URL to search engines

## SEO Benefits

Properly configured sitemaps offer several SEO benefits:

- **Improved Crawling**: Helps search engines discover all your content
- **Faster Indexing**: New jobs are discovered and indexed more quickly
- **Prioritized Content**: Search engines understand which pages are most important
- **Better Understanding**: Provides context about content update frequency
- **Mobile and Alternate URL Support**: Can specify mobile and alternate language versions

## Related Documentation

- [Robots.txt Generation](/docs/reference/robots-generation.md)
- [SEO Optimization](/docs/advanced/seo-optimization.md)
- [Data Revalidation](/docs/advanced/data-revalidation.md)
- [Next.js Sitemap API Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) 