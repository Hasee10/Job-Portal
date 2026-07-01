---
title: Robots.txt Generation
description: Learn how Bordful automatically generates a comprehensive robots.txt file to help search engines understand which parts of your site to crawl.
lastUpdated: "2025-05-22"
---

# Robots.txt Generation

Bordful automatically generates a comprehensive robots.txt file at `/robots.txt` that helps search engines understand which parts of your site to crawl. This feature is an important part of the SEO optimization toolkit included with Bordful.

## Overview

The `robots.txt` file is a standard used by website owners to communicate with web crawlers and other web robots about which areas of the site should not be processed or scanned. Bordful implements this using Next.js's built-in Metadata API for a type-safe and maintainable approach.

## Key Features

- **Dynamic Generation**: Programmatically created using Next.js's Metadata API
- **Customizable Rules**: Configure which user agents can access which parts of your site
- **Protected Routes**: Automatically blocks crawlers from accessing admin and private routes
- **Sitemap Integration**: Automatically links to your sitemap.xml for better indexing
- **Canonical Host**: Defines the canonical hostname to prevent duplicate content issues

## Implementation

The robots.txt file is generated using Next.js's built-in Metadata API in `app/robots.ts`:

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';
import config from '@/config';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = config.url;
  
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/jobs/*',
        '/api/og/*', // Allow Open Graph image API routes
      ],
      disallow: [
        '/admin/*',
        '/private/*',
        '/api/*', // Block most API routes
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
```

The implementation leverages TypeScript for type safety and uses the configuration system to ensure consistency across your site.

## Default Configuration

By default, Bordful's robots.txt configuration:

1. **Allows access to**:
   - The entire site root (`/`)
   - All job listing pages (`/jobs/*`)
   - Open Graph image API routes (`/api/og/*`)

2. **Blocks access to**:
   - Admin pages (`/admin/*`)
   - Private pages (`/private/*`)
   - Most API routes (`/api/*`, except those explicitly allowed)

3. **Links to**:
   - Your sitemap.xml file at the root of your domain
   - Specifies the canonical hostname to prevent duplicate content issues

## Customization

If you need to customize the robots.txt rules, you can modify the `app/robots.ts` file:

### Adding User Agent-Specific Rules

You can target specific web crawlers by adding rules for specific user agents:

```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/private/', '/api/*'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/api/og/*', // Allow Googlebot to access OG images
      },
      {
        userAgent: 'Bingbot',
        disallow: '/jobs/draft/*', // Block Bingbot from draft job listings
      }
    ],
    sitemap: 'https://yourdomain.com/sitemap.xml',
    host: 'https://yourdomain.com',
  }
}
```

### Adding Multiple Sitemaps

If you have multiple sitemaps, you can list them all:

```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/private/', '/api/*'],
    },
    sitemap: [
      'https://yourdomain.com/sitemap.xml',
      'https://yourdomain.com/sitemap-jobs.xml',
      'https://yourdomain.com/sitemap-blog.xml',
    ],
    host: 'https://yourdomain.com',
  }
}
```

## Additional HTTP Headers

In addition to the robots.txt file, Bordful also sets the `X-Robots-Tag` HTTP header on certain routes to provide more granular control. This is implemented in `next.config.ts`:

```typescript
// next.config.ts (excerpt)
async headers() {
  return [
    {
      // Apply to specific routes that shouldn't be indexed
      source: '/api/:path*',
      headers: [
        {
          key: 'X-Robots-Tag',
          value: 'noindex, nofollow',
        },
      ],
    },
    // Additional header configurations...
  ];
}
```

## Testing Your Robots.txt

After deploying your site, you can verify your robots.txt file is working correctly by:

1. Visiting `https://yourdomain.com/robots.txt` directly
2. Using Google's [robots.txt Tester](https://support.google.com/webmasters/answer/6062598?hl=en) in Search Console
3. Testing specific URLs with Google's [URL Inspection Tool](https://support.google.com/webmasters/answer/9012289)

## SEO Benefits

Properly configured robots.txt offers several SEO benefits:

- **Crawl Budget Optimization**: Helps search engines focus on important pages
- **Prevents Indexing of Duplicate Content**: Avoids duplicate content issues
- **Protects Private Areas**: Keeps private or admin sections out of search results
- **Improves Sitemap Discovery**: Makes it easy for search engines to find your sitemap
- **Defines Canonical Domain**: Prevents split metrics across www and non-www versions

## Common Issues and Solutions

### Problem: Blocking Important Content

Be careful not to inadvertently block important content from search engines. For example:

```typescript
// ❌ This would block all job pages from being indexed
disallow: ['/jobs/'],
```

Instead, be specific about what you want to block:

```typescript
// ✅ Only block specific paths
disallow: ['/jobs/draft/', '/jobs/expired/'],
```

### Problem: Inconsistent URL Formats

Ensure that your sitemap URL and host configuration match your actual site URL format:

```typescript
// ❌ Mixed URL formats can cause issues
sitemap: 'https://example.com/sitemap.xml',
host: 'https://www.example.com',
```

Instead, use consistent URLs:

```typescript
// ✅ Consistent URL format
sitemap: 'https://www.example.com/sitemap.xml',
host: 'https://www.example.com',
```

## Related Documentation

- [Sitemap Generation](/docs/reference/sitemap-generation.md)
- [SEO Optimization](/docs/advanced/seo-optimization.md)
- [Next.js Metadata API Documentation](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#robots) 