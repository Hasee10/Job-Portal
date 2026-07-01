---
title: Data Revalidation
description: Learn how Bordful uses Next.js Incremental Static Regeneration (ISR) and server-side caching to keep data fresh and maintain performance.
lastUpdated: "2025-05-22"
---

# Data Revalidation

Bordful uses Next.js Incremental Static Regeneration (ISR) and server-side caching to keep job data fresh while maintaining fast page loads:

## Key Features

- Pages automatically revalidate every 5 minutes
- Server-side caching with unstable_cache
- Content-specific loading states
- New jobs appear without manual rebuilds
- Maintains fast static page delivery
- Zero downtime updates

## How It Works

Incremental Static Regeneration (ISR) allows Bordful to update static content after it has been generated. This means:

1. Pages are initially generated statically at build time
2. Subsequent requests continue to serve the cached static version
3. In the background, the page is regenerated after the specified revalidation period
4. Once regenerated, the next request will receive the updated version
5. If the background regeneration fails, the old version continues to be served

## Customizing Revalidation Periods

You can adjust the revalidation interval by modifying the `revalidate` constant in page files:

```typescript
// Set revalidation period in seconds (e.g., 300 = 5 minutes)
export const revalidate = 300;
```

### Considerations

When adjusting revalidation periods, consider these trade-offs:

- **Shorter periods** (e.g., 60 seconds)
  - More frequent updates
  - More API calls to Airtable
  - Higher hosting costs
  - Better content freshness

- **Longer periods** (e.g., 3600 seconds)
  - Fewer API calls
  - Lower hosting costs
  - Less frequent content updates
  - Content may be stale for longer

- **Static content** (e.g., about, terms pages)
  - Consider using `export const dynamic = "force-static"` instead
  - No revalidation, only updated on rebuild

## Default Configuration

All page files consistently use a 5-minute (300 seconds) revalidation period by default. Files with revalidation settings:

- `app/page.tsx` (home page)
- `app/jobs/[slug]/page.tsx` (individual job pages)
- `app/jobs/page.tsx` (main jobs listing page)
- `app/jobs/levels/page.tsx` (career levels directory)
- `app/jobs/languages/page.tsx` (languages directory)
- `app/jobs/location/[location]/page.tsx` (location-specific jobs)
- `app/jobs/level/[level]/page.tsx` (career level-specific jobs)
- `app/jobs/language/[language]/page.tsx` (language-specific jobs)
- `app/jobs/locations/page.tsx` (locations directory)
- `app/jobs/types/page.tsx` (job types directory)
- `app/jobs/type/[type]/page.tsx` (job type-specific jobs)

## Static Content

For content that rarely changes, the app uses `export const dynamic = "force-static"` in these files:
- `app/about/page.tsx`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `app/changelog/page.tsx`

This approach ensures these pages are generated at build time and not regenerated, saving API calls and improving performance.

## API Routes and RSS Feeds

API routes also use revalidation to ensure fresh data:

- `/api/job-raw/[slug]/route.ts` - Raw job data endpoint
- `/api/og/jobs/[slug]/route.ts` - OpenGraph image generation
- `/feed.xml/route.ts` - RSS feed
- `/atom.xml/route.ts` - Atom feed
- `/feed.json/route.ts` - JSON feed

Each of these routes implements the same 5-minute revalidation period to maintain consistency with page data.

## Implementation Details

Bordful uses a combination of Next.js features to optimize data revalidation:

1. **Page-level Revalidation**: Using `export const revalidate = 300` in page files
2. **Route Handler Revalidation**: Using the same approach in API routes
3. **Server-Side Caching**: Using `unstable_cache` from Next.js for database queries
4. **Content-Specific Loading States**: Custom loading UI for pages during revalidation
5. **Consistent Revalidation Periods**: 5-minute default across all dynamic content

## Related Documentation

- [Next.js ISR Documentation](https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration)
- [Server-Side Caching](/docs/advanced/server-side-caching.md)
- [Performance Optimization](/docs/advanced/performance-optimization.md) 