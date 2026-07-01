---
title: Configuration Options Reference
description: Comprehensive documentation for all Bordful configuration options and their effects.
lastUpdated: "2025-05-22"
---

# Configuration Options Reference

Bordful is highly configurable through the `config/config.ts` file. This reference documents all available configuration options, their expected values, and their effects on your job board.

## Configuration Structure

The configuration file is a TypeScript object with typed properties for each section of your job board. The configuration is organized into logical sections for easy navigation and maintenance.

## Getting Started with Configuration

To begin configuring your job board:

1. Copy the example configuration file:
   ```bash
   cp config/config.example.ts config/config.ts
   ```
2. Edit `config/config.ts` with your preferred settings
3. The changes will be applied on the next build or development restart

## Core Configuration Sections

### Base Configuration

These options define the fundamental properties of your job board:

```typescript
// config/config.ts
const config = {
  // Site title - used in metadata, browser tabs, and various UI elements
  title: "Your Job Board",
  
  // Site description - used in metadata and SEO
  description: "Browse curated job opportunities from leading companies",
  
  // Base URL of your site (with no trailing slash)
  url: "https://example.com",
  
  // Site language - affects HTML lang attribute and default content
  language: "en",
  
  // Whether the site is in development mode
  development: process.env.NODE_ENV === "development",
  
  // ...other sections
};
```

### Font Configuration

Control the typography throughout your job board:

```typescript
font: {
  // Font family to use throughout the site
  // Available options: "geist" | "inter" | "ibm-plex-serif"
  family: "geist" as FontFamily,

  // Whether to load the font from Google Fonts (for Inter and IBM Plex Serif)
  // IMPORTANT: Must be true for IBM Plex Serif and Inter
  // Geist is self-hosted by default
  useGoogleFonts: true,

  // Font weights to load (applies to Google Fonts)
  // For Geist, the standard weights are loaded automatically
  weights: [400, 500, 600, 700],
},
```

### UI Configuration

Customize the visual appearance of your job board:

```typescript
ui: {
  // Hero section background color (CSS color value)
  heroBackgroundColor: "#005450",

  // Hero section gradient background
  heroGradient: {
    enabled: false,
    type: "linear" as "linear" | "radial",
    direction: "to top",
    colors: ["#005450", "#007a73", "#00a59c"],
    stops: ["0%", "50%", "100%"],
  },

  // Hero section background image
  heroBackgroundImage: {
    enabled: true,
    src: "/hero-background.jpg",
    position: "center",
    size: "cover",
    overlay: {
      enabled: false,
      color: "rgba(0, 84, 80, 0.7)",
      opacity: 0.7,
    },
  },

  // Text colors
  heroTitleColor: "#fff",
  heroSubtitleColor: "#fff",
  heroStatsColor: "#fff",

  // Badge styling
  heroBadgeVariant: "outline" as "default" | "secondary" | "outline" | "destructive",
  heroBadgeBgColor: "#fff",
  heroBadgeTextColor: "#005450",
  heroBadgeBorderColor: "#fff",
},
```

### Navigation Configuration

Configure the site navigation and menu structure:

```typescript
nav: {
  // Site title shown in the navigation bar
  title: "Your Job Board",
  
  // Logo configuration
  logo: {
    enabled: true,
    src: "/logo.svg",
    width: 120,
    height: 36,
    alt: "Your Job Board Logo",
  },
  
  // Social media links
  github: { show: true, url: "https://github.com/yourusername" },
  linkedin: { show: true, url: "https://linkedin.com/company/yourcompany" },
  twitter: { show: true, url: "https://twitter.com/yourhandle" },
  bluesky: { show: false, url: "" },
  reddit: { show: false, url: "" },
  
  // Post job button
  postJob: {
    show: true,
    label: "Post a Job",
    link: "/post-job",
    external: false,
    variant: "primary" as "default" | "primary" | "outline" | "secondary" | "ghost" | "link",
  },
  
  // Navigation menu items
  menu: [
    {
      label: "Jobs",
      link: "/jobs",
      dropdown: true,
      items: [
        { label: "All Jobs", link: "/jobs" },
        { label: "Remote Jobs", link: "/jobs/type/remote" },
        { label: "By Location", link: "/jobs/locations" },
        { label: "By Category", link: "/jobs/categories" },
      ],
    },
    {
      label: "About",
      link: "/about",
      dropdown: false,
    },
    // Add more menu items as needed
  ],
},
```

### Footer Configuration

Configure the site footer:

```typescript
footer: {
  // Footer column configuration
  columns: [
    {
      title: "Jobs",
      links: [
        { label: "Browse All", link: "/jobs" },
        { label: "Remote Jobs", link: "/jobs/type/remote" },
        { label: "Locations", link: "/jobs/locations" },
        { label: "Categories", link: "/jobs/categories" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", link: "/about" },
        { label: "Contact", link: "/contact" },
        { label: "FAQ", link: "/faq" },
      ],
    },
    // Add more columns as needed
  ],
  
  // Bottom links (terms, privacy, etc.)
  bottomLinks: [
    { label: "Terms", link: "/terms" },
    { label: "Privacy", link: "/privacy" },
    { label: "Cookies", link: "/cookies" },
  ],
  
  // Copyright text (supports variable substitution)
  copyright: "© {{year}} Your Company. All rights reserved.",
},
```

### Job Listing Configuration

Configure how job listings are displayed and organized:

```typescript
jobs: {
  // Whether to show a list of featured jobs
  showFeatured: true,
  
  // Number of featured jobs to display
  featuredCount: 5,
  
  // Criteria for selecting featured jobs (default: most recently posted)
  featuredCriteria: "recent" as "recent" | "popular" | "sponsored",
  
  // Default number of jobs per page for pagination
  perPage: 20,
  
  // Default sorting method for job listings
  defaultSort: "date" as "date" | "company" | "title" | "salary",
  
  // Default sort direction
  defaultSortDirection: "desc" as "asc" | "desc",
  
  // Flags for enabling or disabling specific filters
  filters: {
    enableType: true,
    enableLocation: true,
    enableRemote: true,
    enableCategory: true,
    enableSalary: true,
    enableCompany: true,
    enableSearch: true,
    enableLanguage: true,
  },
  
  // Settings for job detail pages
  detail: {
    // Show company information on job detail page
    showCompanyInfo: true,
    
    // Show related jobs section
    showRelatedJobs: true,
    
    // Number of related jobs to display
    relatedJobsCount: 4,
    
    // Method for selecting related jobs
    relatedJobsMethod: "category" as "category" | "company" | "mixed",
  },
},
```

### Currency Configuration

Configure currency display and handling:

```typescript
currency: {
  // Default currency code used when no currency is specified
  defaultCurrency: "USD",
  
  // Allowed currencies for job listings
  // Set to null to allow all currencies, or specify a subset
  allowedCurrencies: ["USD", "EUR", "GBP", "USDT", "BTC", "ETH"],
},
```

### Email and Subscription Configuration

Configure email and subscription functionality:

```typescript
email: {
  // Default email provider
  provider: "encharge",
  
  // Encharge configuration
  encharge: {
    // Your Encharge write key
    writeKey: process.env.ENCHARGE_WRITE_KEY,
    
    // Tags to apply to all subscribers (comma-separated)
    defaultTags: "job-alerts-subscriber",
    
    // Event name used when tracking subscriptions
    eventName: "Job Alert Subscription",
  },
  
  // Job alert email configuration
  jobAlerts: {
    // Whether to enable job alerts
    enabled: true,
    
    // Form layout: "minimal" for just email or "detailed" for more options
    formLayout: "detailed" as "minimal" | "detailed",
    
    // Whether to include location preferences in subscription form
    enableLocationPreferences: true,
    
    // Whether to include job type preferences in subscription form
    enableTypePreferences: true,
    
    // Whether to include language preferences in subscription form
    enableLanguagePreferences: true,
  },
},
```

### Analytics and Tracking Configuration

Configure analytics and tracking scripts:

```typescript
scripts: {
  // Scripts to be loaded in <head>
  head: [
    {
      src: "https://analytics.example.com/script.js",
      strategy: "afterInteractive",
      attributes: {
        "data-website-id": "your-website-id",
        defer: "",
      },
    },
  ],
  
  // Scripts to be loaded at end of <body>
  body: [
    // Less critical scripts go here
  ],
},
```

### SEO Configuration

Configure SEO-related settings:

```typescript
seo: {
  // Google Jobs integration
  googleJobs: {
    enabled: true,
    enhancedStructuredData: true,
    defaultEmploymentType: "FULL_TIME",
    defaultJobLocationType: "TELECOMMUTE",
  },
  
  // OpenGraph settings for social sharing
  openGraph: {
    // Default image for social sharing
    defaultImage: "/og-image.jpg",
    // Image dimensions
    imageWidth: 1200,
    imageHeight: 630,
  },
},
```

### Contact Form Configuration

Configure the contact form:

```typescript
contact: {
  // Whether to enable the contact form
  enabled: true,
  
  // Email address where contact form submissions will be sent
  email: "contact@example.com",
  
  // Form fields to include
  fields: {
    name: { required: true },
    email: { required: true },
    subject: { required: true },
    message: { required: true },
    company: { required: false },
    phone: { required: false },
  },
  
  // Confirmation message shown after successful submission
  confirmationMessage: "Thank you for your message. We'll get back to you soon!",
},
```

### Pricing Configuration

Configure the pricing page:

```typescript
pricing: {
  // Whether to enable the pricing page
  enabled: true,
  
  // Hero section configuration
  hero: {
    title: "Simple, Transparent Pricing",
    description: "Choose the plan that fits your needs.",
  },
  
  // Currency symbol for pricing display
  currencySymbol: "$",
  
  // Available plans
  plans: [
    {
      name: "Basic",
      price: 0,
      billingTerm: "Free",
      description: "For individuals posting occasional jobs.",
      features: [
        "1 job posting",
        "30 days visibility",
        "Basic job listing",
      ],
      cta: {
        label: "Get Started",
        link: "/post-job",
        variant: "outline",
      },
      badge: null,
      highlighted: false,
    },
    {
      name: "Premium",
      price: 99,
      billingTerm: "per job",
      description: "For companies with regular hiring needs.",
      features: [
        "1 job posting",
        "60 days visibility",
        "Featured in job listings",
        "Social media promotion",
        "Company branding",
      ],
      cta: {
        label: "Post a Job",
        link: "/post-job?plan=premium",
        variant: "default",
      },
      badge: {
        text: "Popular",
        type: "default",
      },
      highlighted: true,
    },
    // Add more plans as needed
  ],
},
```

### FAQ Configuration

Configure the FAQ page:

```typescript
faq: {
  // Whether to enable the FAQ page
  enabled: true,
  
  // Hero section configuration
  hero: {
    title: "Frequently Asked Questions",
    description: "Find answers to common questions about our job board.",
  },
  
  // FAQ categories and items
  categories: [
    {
      title: "For Job Seekers",
      items: [
        {
          question: "How do I apply for a job?",
          answer: "Click the 'Apply Now' button on any job listing to be directed to the application process.",
          isRichText: false,
        },
        // Add more FAQ items as needed
      ],
    },
    {
      title: "For Employers",
      items: [
        {
          question: "How do I post a job?",
          answer: "Click the 'Post a Job' button in the navigation and follow the steps to create your listing.",
          isRichText: false,
        },
        // Add more FAQ items as needed
      ],
    },
    // Add more categories as needed
  ],
},
```

## Hero Pages Configuration

Configure specific hero sections for different pages:

```typescript
heroPages: {
  // Home page hero configuration
  home: {
    title: "Find Your Next Job in Tech",
    description: "Browse curated opportunities from leading companies. Updated daily with the latest positions.",
    image: null as HeroImageConfig | null,
  },
  
  // Jobs page hero configuration
  jobs: {
    title: "Browse All Jobs",
    description: "Explore our curated list of opportunities at leading companies.",
    image: null as HeroImageConfig | null,
  },
  
  // About page hero configuration
  about: {
    title: "About Us",
    description: "Learn more about our mission to connect talented professionals with great companies.",
    image: null as HeroImageConfig | null,
  },
  
  // Add configuration for other pages as needed
},
```

## Page-Specific Configurations

Many pages have their own configuration sections:

```typescript
// Jobs page configurations
jobsPages: {
  // Configuration for the main jobs page
  main: {
    heroImage: null as HeroImageConfig | null,
    showFilters: true,
    showFeatured: true,
  },
  
  // Configuration for job locations page
  locations: {
    heroImage: null as HeroImageConfig | null,
  },
  
  // Configuration for job categories page
  categories: {
    heroImage: null as HeroImageConfig | null,
  },
  
  // Configuration for job types page
  types: {
    heroImage: null as HeroImageConfig | null,
  },
  
  // Configuration for dynamic pages
  dynamicPages: {
    // Job detail page
    job: {
      heroImage: null as HeroImageConfig | null,
    },
    
    // Job category page
    category: {
      heroImage: null as HeroImageConfig | null,
    },
    
    // Job location page
    location: {
      heroImage: null as HeroImageConfig | null,
    },
    
    // Job type page
    type: {
      heroImage: null as HeroImageConfig | null,
    },
  },
},
```

## Feature-Specific Configurations

Configure specific features like job alerts:

```typescript
jobAlerts: {
  // Hero section for job alerts page
  hero: {
    title: "Stay Updated with Job Alerts",
    description: "Get notified when new jobs matching your criteria are posted.",
    image: null as HeroImageConfig | null,
  },
  
  // Configuration for the job alerts form
  form: {
    // Fields to include in the form
    fields: {
      name: { required: true },
      email: { required: true },
      jobTypes: { required: false },
      locations: { required: false },
      languages: { required: false },
    },
    
    // Confirmation message shown after successful subscription
    confirmationMessage: "You've been subscribed to job alerts. Check your email for confirmation.",
  },
},
```

## Advanced Configurations

### RSS Feed Configuration

```typescript
rss: {
  // Whether to enable RSS feeds
  enabled: true,
  
  // Title used in the RSS feed
  title: "Latest Jobs",
  
  // Description used in the RSS feed
  description: "The latest job postings from our job board",
  
  // Number of items to include in the feed
  limit: 100,
  
  // Whether to include full job descriptions in the feed
  includeContent: true,
},
```

### Sitemap Configuration

```typescript
sitemap: {
  // Whether to enable sitemap generation
  enabled: true,
  
  // Additional URLs to include in the sitemap
  additionalUrls: [],
  
  // URLs to exclude from the sitemap
  excludeUrls: [],
},
```

## Environment Variable Integration

The configuration file can reference environment variables for sensitive data or values that change between environments:

```typescript
// Example of using environment variables in configuration
email: {
  provider: process.env.EMAIL_PROVIDER || "encharge",
  encharge: {
    writeKey: process.env.ENCHARGE_WRITE_KEY,
    // Other configuration...
  },
},
```

## Best Practices for Configuration

1. **Environment Variables**: Use environment variables for sensitive information like API keys
2. **Defaults**: Provide sensible defaults for all configuration options
3. **Type Safety**: Leverage TypeScript types to ensure configuration validity
4. **Comments**: Document complex configuration options with comments
5. **Validation**: Validate configuration values at runtime to catch errors early

## Related Documentation

- [Environment Variables Reference](/docs/reference/environment-variables.md) - List of all supported environment variables
- [Currency System Reference](/docs/reference/currencies.md) - Documentation for currency configuration
- [Language System](/docs/reference/language-system.md) - Documentation for language configuration
- [Customization Guide](/docs/guides/theming-customization.md) - Guide to customizing the appearance of your job board 