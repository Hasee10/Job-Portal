---
title: RSS Feed System
description: Documentation for Bordful's comprehensive RSS feed system that allows users to subscribe to job listings in multiple formats.
lastUpdated: "2025-05-22"
---

# RSS Feed System

Bordful includes a comprehensive RSS feed system that allows users to subscribe to job listings in multiple formats, enabling integration with feed readers and other applications.

## Key Features

- Multiple feed formats (RSS 2.0, Atom, JSON Feed)
- Rich job content with customizable preview length
- Auto-discovery links for feed readers
- Navigation and footer integration
- Proper MIME types for optimal compatibility
- Full configuration control via config file

## Available Feed Formats

Bordful supports three feed formats to maximize compatibility with different applications:

- **RSS 2.0**: Available at `/feed.xml`
  - Most widely supported format
  - Compatible with virtually all feed readers
  - Uses the `application/rss+xml` MIME type

- **Atom**: Available at `/atom.xml`
  - More standardized format with better extension support
  - Better handling of content encoding
  - Uses the `application/atom+xml` MIME type

- **JSON Feed**: Available at `/feed.json`
  - Modern JSON-based format
  - Easier to parse in JavaScript applications
  - Uses the `application/feed+json` MIME type

## Feed Content

Each feed includes rich content about job listings:

- Job titles with company names
- Job descriptions (with configurable preview length)
- Job metadata (type, location, salary, posting date)
- Direct links to apply
- Author information (company with apply link)
- Categories based on job type, career level, and languages
- Featured job indicators

## Discovery and Access

Bordful makes it easy for users to discover and access the feeds:

- **Auto-discovery links**: Added to the HTML head for automatic feed reader detection
- **Navigation integration**: Optional RSS icon in the navigation bar
- **Footer links**: Feed links in the footer with format options
- **Proper MIME types**: Each feed uses the appropriate MIME type:
  - `application/rss+xml` for RSS
  - `application/atom+xml` for Atom
  - `application/feed+json` for JSON Feed

## Implementation

The feeds are implemented using Next.js route handlers with 5-minute revalidation and configuration-based settings:

```typescript
// app/feed.xml/route.ts (and similar for other formats)
export const revalidate = 300; // 5 minutes

export async function GET() {
  // Check if RSS feeds are enabled in the configuration
  if (!config.rssFeed?.enabled || !config.rssFeed?.formats?.rss) {
    return new Response("RSS feed not enabled", { status: 404 });
  }

  // Feed setup with configuration options
  const feed = new Feed({
    title: config.rssFeed?.title || `${config.title} | Job Feed`,
    description: config.rssFeed?.description || config.description,
    id: `${config.url}/feed.xml`,
    link: config.url,
    language: "en",
    image: `${config.url}/logo.png`,
    favicon: `${config.url}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    generator: "Bordful Job Board",
    feedLinks: {
      rss2: `${config.url}/feed.xml`,
      atom: `${config.url}/atom.xml`,
      json: `${config.url}/feed.json`,
    },
  });
  
  // Use the configured description length
  const descriptionLength = config.rssFeed?.descriptionLength || 500;
  
  // Add job items with the configured description length
  jobs.forEach(job => {
    // Process job data
    const jobUrl = `${config.url}/jobs/${job.slug}`;
    const jobTitle = `${job.title} at ${job.company}`;
    
    // Format job description with limited length
    const jobDescription = `
      <p><strong>${job.title}</strong> at <strong>${job.company}</strong></p>
      <p>Job Type: ${job.type} | Location: ${job.location}</p>
      <p>Salary: ${formatSalary(job)}</p>
      <p>${job.description.substring(0, descriptionLength)}...</p>
      <p><a href="${job.apply_url}">Apply Now</a></p>
    `;
    
    // Add job to feed
    feed.addItem({
      title: jobTitle,
      id: jobUrl,
      link: jobUrl,
      description: jobDescription,
      content: jobDescription,
      author: [
        {
          name: job.company,
          link: job.apply_url,
        },
      ],
      date: new Date(job.posted_date),
      image: job.company_logo || `${config.url}/logo.png`,
      // Add categories based on job properties
      category: [
        { name: job.type },
        ...(job.career_level ? job.career_level.map(level => ({ name: level })) : []),
        ...(job.languages ? job.languages.map(lang => ({ name: lang })) : []),
      ],
      // Add extension for featured jobs
      extensions: [
        {
          name: '_featured',
          objects: {
            featured: job.featured ? 'true' : 'false',
          },
        },
      ],
    });
  });
  
  // Return with proper content type
  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
```

Similar implementations exist for the Atom and JSON feed formats, with appropriate content type headers.

## Configuration

The RSS feed system is fully configurable through the configuration file:

```typescript
rssFeed: {
  // Enable or disable RSS feeds
  enabled: true,

  // Show RSS feed links in navigation
  showInNavigation: true,
  
  // Show RSS feed links in footer
  showInFooter: true,

  // Navigation label (if showing in navigation)
  navigationLabel: "RSS Feed",
  
  // Footer label (if showing in footer)
  footerLabel: "Job Feeds",
  
  // Title for the RSS feed
  title: "Latest Jobs Feed",
  
  // Description for the RSS feed
  description: "Subscribe to our latest job listings",
  
  // Number of job description characters to include (preview length)
  descriptionLength: 500,

  // Available formats (enable/disable specific formats)
  formats: {
    rss: true,    // RSS 2.0 format
    atom: true,   // Atom format
    json: true,   // JSON Feed format
  },
},
```

### Configuration Options

- **`enabled`**: Master switch to enable or disable the entire feed system
- **`showInNavigation`**: Show an RSS icon in the navigation bar
- **`showInFooter`**: Show feed links in the footer
- **`navigationLabel`**: Text for the navigation link (if showing in navigation)
- **`footerLabel`**: Text for the footer link (if showing in footer)
- **`title`**: Custom title for all feed formats (defaults to site title + " | Job Feed")
- **`description`**: Custom description for feeds (defaults to site description)
- **`descriptionLength`**: Number of characters to include from job descriptions
- **`formats`**: Object controlling which formats are enabled:
  - **`rss`**: Enable/disable RSS 2.0 format
  - **`atom`**: Enable/disable Atom format
  - **`json`**: Enable/disable JSON Feed format

## Use Cases

- **Job Seekers**: Subscribe to job listings in their preferred feed reader
- **Integration**: Integrate job listings with other applications or websites
- **Notifications**: Get notified of new jobs automatically
- **Sharing**: Share feed URLs with interested candidates
- **Resource Management**: Disable unused formats to reduce server load

## Implementation Details

### HTML Head Auto-discovery

The feed links are added to the HTML head for automatic discovery by feed readers:

```html
<link rel="alternate" type="application/rss+xml" title="Job Feed (RSS)" href="/feed.xml" />
<link rel="alternate" type="application/atom+xml" title="Job Feed (Atom)" href="/atom.xml" />
<link rel="alternate" type="application/feed+json" title="Job Feed (JSON)" href="/feed.json" />
```

### Navigation Integration

If enabled, an RSS icon appears in the navigation bar:

```tsx
{config.rssFeed?.enabled && config.rssFeed?.showInNavigation && (
  <Link href="/feed.xml" className="text-muted-foreground hover:text-primary" title="RSS Feed">
    <Rss className="h-5 w-5" />
    <span className="sr-only">{config.rssFeed?.navigationLabel || "RSS Feed"}</span>
  </Link>
)}
```

### Footer Integration

If enabled, feed links appear in the footer:

```tsx
{config.rssFeed?.enabled && config.rssFeed?.showInFooter && (
  <div className="footer-section">
    <h3 className="text-sm font-semibold">{config.rssFeed?.footerLabel || "Job Feeds"}</h3>
    <ul className="mt-2 space-y-2 text-sm">
      {config.rssFeed?.formats?.rss && (
        <li><Link href="/feed.xml">RSS Feed</Link></li>
      )}
      {config.rssFeed?.formats?.atom && (
        <li><Link href="/atom.xml">Atom Feed</Link></li>
      )}
      {config.rssFeed?.formats?.json && (
        <li><Link href="/feed.json">JSON Feed</Link></li>
      )}
    </ul>
  </div>
)}
```

## Related Documentation

- [Data Revalidation](/docs/advanced/data-revalidation.md)
- [Configuration Options](/docs/reference/configuration-options.md)
- [Sitemap Generation](/docs/reference/sitemap-generation.md) 