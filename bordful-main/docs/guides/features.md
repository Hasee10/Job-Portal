---
title: Bordful Features
description: An overview of Bordful's core features, with examples and configuration options.
lastUpdated: "2025-05-22"
---

# Bordful Features

Bordful includes a comprehensive set of features designed to create a modern, functional job board. This guide provides an overview of the core features with configuration examples and practical usage scenarios.

## Job Listings and Management

The heart of Bordful is its job listing system, providing a clean, searchable interface for job seekers.

### Key Features

- Responsive job cards with hover effects
- Detailed job detail pages with rich content
- Featured job highlighting
- Smart pagination and sorting
- Comprehensive filtering system
- Real-time search

### Configuration Example

```typescript
// config/config.ts
jobListing: {
  // Number of jobs per page
  jobsPerPage: 10,
  
  // Default sort order
  defaultSort: "newest",
  
  // Show similar jobs
  showSimilarJobs: true,
  similarJobsCount: 3,
  
  // Card display options
  cards: {
    showLogo: true,
    showSalary: true,
    showDate: true,
    showLocation: true,
    showType: true,
  }
}
```

## Advanced Filtering System

Bordful includes a comprehensive filtering system that allows users to narrow down job listings.

### Key Features

- Job type filtering (Full-time, Part-time, Contract, etc.)
- Career level filtering (Junior, Mid-level, Senior, etc.)
- Remote work filtering
- Salary range filtering
- Visa sponsorship filtering
- Language requirement filtering
- URL parameter persistence for shareable filtered views

### Configuration Example

```typescript
// config/config.ts
filtering: {
  enabled: true,
  filters: {
    jobTypes: true,
    careerLevels: true,
    remote: true,
    salary: true,
    visa: true,
    languages: true,
  },
  salaryRanges: [
    { label: "Under $50k", min: 0, max: 50000 },
    { label: "$50k - $100k", min: 50000, max: 100000 },
    { label: "$100k - $150k", min: 100000, max: 150000 },
    { label: "Over $150k", min: 150000, max: null },
  ]
}
```

## Job Alerts System

The job alerts system allows users to subscribe to email notifications for new job postings.

### Key Features

- Dedicated subscription page
- Customizable form fields
- Integration with email providers
- Success/error messaging
- Rate limiting protection

### Configuration Example

```typescript
// config/config.ts
jobAlerts: {
  enabled: true,
  showInNavigation: true,
  showInFooter: true,
  navigationLabel: "Job Alerts",
  hero: {
    badge: "Never Miss a Job",
    title: "Get Jobs Right to Your Inbox",
    description: "Subscribe to job alerts and get notified when new opportunities are posted."
  },
  form: {
    heading: "Subscribe for Updates",
    description: "Get notified when new jobs are posted that match your interests."
  },
  provider: "encharge"
}
```

## Multi-Currency Salary System

Bordful includes a sophisticated salary handling system with multiple currencies and formats.

### Key Features

- Support for 50+ global currencies
- Cryptocurrency support (Bitcoin, Ethereum, etc.)
- Intelligent symbol formatting
- Smart salary range display
- Multiple time units (hour, day, week, month, year)
- Normalization for sorting and filtering

### Configuration Example

```typescript
// config/config.ts
currency: {
  defaultCurrency: "USD",
  allowedCurrencies: ["USD", "EUR", "GBP", "BTC", "ETH"],
},
salary: {
  showCurrencyCode: true,
  showOnCards: true,
  format: {
    useCompact: true,
    kThreshold: 10000,
    mThreshold: 1000000,
  }
}
```

## Enhanced Language System

Bordful features a comprehensive language system for multilingual job support.

### Key Features

- Full ISO 639-1 support (184 language codes)
- User-friendly Airtable format
- Language-specific job pages
- Language filtering with alphabetical sorting
- SEO-optimized language URLs

### Configuration Example

```typescript
// This is configured in your Airtable base
// The languages field is a multiple select with options like:
// "English (en)", "Spanish (es)", "French (fr)", etc.

// In config/config.ts you can control language display
language: {
  // Show language badges on job cards
  showBadgesOnCards: true,
  
  // Show language section in job sidebar
  showInSidebar: true,
  
  // Language filter label
  filterLabel: "Languages",
}
```

## Schema.org Structured Data

Bordful implements comprehensive schema.org structured data for job listings.

### Key Features

- Complete JobPosting schema implementation
- Rich search results in Google and other search engines
- Google Jobs integration
- Remote job schema support
- Salary, location, and company information

### Configuration Example

This feature is automatically enabled. To enhance it, add optional fields to your Airtable base:

- skills
- qualifications
- education_requirements
- experience_requirements
- responsibilities
- industry
- occupational_category

## RSS Feed System

Bordful includes a comprehensive RSS feed system for job subscriptions.

### Key Features

- Support for RSS 2.0, Atom, and JSON Feed formats
- Rich job content with customizable preview length
- Auto-discovery links for feed readers
- Navigation and footer integration

### Configuration Example

```typescript
// config/config.ts
rss: {
  enabled: true,
  showInNavigation: true,
  showInFooter: true,
  title: "Job Postings",
  description: "Latest job postings from our job board",
  navigationLabel: "RSS Feed",
  footerLabel: "RSS",
  formatsEnabled: {
    rss: true,
    atom: true,
    json: true,
  },
  descriptionLength: 300,
}
```

## Email Integration

Bordful includes flexible email provider integration for handling job alert subscriptions.

### Key Features

- Server-side API route for secure handling
- Support for multiple email providers
- Enhanced data collection for targeting
- Rich segmentation data

### Configuration Example

```typescript
// config/config.ts
email: {
  provider: "encharge",
  encharge: {
    writeKey: process.env.ENCHARGE_WRITE_KEY,
    defaultTags: "job-alerts-subscriber",
    eventName: "Job Alert Subscription",
  },
}
```

## SEO Features

Bordful includes comprehensive SEO features for better search engine visibility.

### Key Features

- Schema.org JobPosting structured data
- Automatic XML sitemap generation
- Programmatic robots.txt
- SEO-friendly URLs
- Meta tags and Open Graph support

### Configuration Example

```typescript
// config/config.ts
seo: {
  // Enable/disable automatic sitemap generation
  generateSitemap: true,
  
  // Enable/disable robots.txt generation
  generateRobots: true,
  
  // Default meta tags
  defaultMeta: {
    ogImage: "/images/og-default.jpg",
    twitterCard: "summary_large_image",
    twitterCreator: "@yourusername",
  }
}
```

## Comprehensive Customization

Bordful is designed to be highly customizable to match your brand identity.

### Key Features

- Theming and color customization
- Navigation and footer customization
- Hero section customization
- Logo and branding options
- Script and analytics integration

### Configuration Example

```typescript
// config/config.ts
ui: {
  primaryColor: "#4f46e5",
  titleColor: "#111827",
  textColor: "#374151",
  mutedTextColor: "#6b7280",
  heroBackgroundColor: "#f9fafb",
  // For more options, see the Theming Customization guide
},
scripts: {
  head: [
    {
      src: "https://analytics.example.com/script.js",
      strategy: "afterInteractive",
      attributes: {
        "data-website-id": "your-id",
        defer: "",
      },
    },
  ],
}
```

## Related Documentation

- [Job Listings Configuration](/docs/guides/job-listings.md)
- [Filtering System](/docs/guides/filtering-system.md)
- [Job Alerts Configuration](/docs/guides/job-alerts.md)
- [Navigation Customization](/docs/guides/navigation.md)
- [Footer Customization](/docs/guides/footer.md)
- [Theming and Customization](/docs/guides/theming-customization.md)
- [Salary Structure](/docs/reference/salary-structure.md)
- [Enhanced Language System](/docs/reference/language-system.md)
- [Schema Implementation](/docs/advanced/schema-implementation.md) 