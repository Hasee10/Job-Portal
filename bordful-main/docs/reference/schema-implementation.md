---
title: Schema.org Implementation Guide
description: Comprehensive documentation for Bordful's schema.org structured data implementation for enhanced SEO and rich search results.
lastUpdated: "2025-05-22"
---

# Schema.org Implementation Guide

Bordful implements comprehensive schema.org structured data for job listings, website information, and other content. This guide explains how the schema implementation works, how to customize it, and how to validate your schema markup.

## Overview

Schema.org structured data is a standardized format for providing information about a page and classifying its content. Search engines like Google use this data to understand the content of your pages and to enable special search result features like rich snippets.

Bordful implements several schema.org types:

1. **JobPosting** - For job listing pages
2. **WebSite** - For global site information
3. **AboutPage** - For the about page
4. **BreadcrumbList** - For navigation breadcrumbs

## JobPosting Schema

The JobPosting schema is implemented for each individual job listing page, providing detailed structured data for search engines to understand your job postings.

### Key Properties Implemented

| Property                 | Description                             | Source in Airtable                                   |
| ------------------------ | --------------------------------------- | ---------------------------------------------------- |
| `title`                  | Job title                               | `title` field                                        |
| `description`            | Job description                         | `description` field                                  |
| `datePosted`             | Publication date                        | `posted_date` field                                  |
| `validThrough`           | Expiration date                         | `valid_through` field                                |
| `hiringOrganization`     | Company information                     | `company` field                                      |
| `jobLocation`            | Job location                            | `location` field                                     |
| `employmentType`         | Type of employment                      | `job_type` field                                     |
| `baseSalary`             | Salary information                      | `salary_min`, `salary_max`, `salary_currency` fields |
| `skills`                 | Required skills                         | `skills` field                                       |
| `qualifications`         | Required qualifications                 | `qualifications` field                               |
| `experienceRequirements` | Experience needed                       | `experience` field                                   |
| `industry`               | Industry category                       | `industry` field                                     |
| `occupationalCategory`   | Occupational category                   | `category` field                                     |
| `jobBenefits`            | Benefits offered                        | `benefits` field                                     |
| `directApply`            | Whether direct application is available | `direct_apply` field                                 |

### Remote Job Support

Bordful provides proper structured data for remote jobs:

```typescript
// Example of remote job structured data
if (isRemoteJob) {
  jobPostingSchema.jobLocationType = "TELECOMMUTE";
  
  // If specific regions are allowed for remote work
  if (job.remote_regions && job.remote_regions.length > 0) {
    jobPostingSchema.applicantLocationRequirements = {
      "@type": "Country",
      name: job.remote_regions.join(", ")
    };
  }
}
```

### Salary Information

Salary data is structured according to schema.org requirements:

```typescript
// Example of salary structured data
jobPostingSchema.baseSalary = {
  "@type": "MonetaryAmount",
  currency: job.salary_currency || "USD",
  value: {
    "@type": "QuantitativeValue",
    minValue: job.salary_min,
    maxValue: job.salary_max,
    unitText: job.salary_period || "YEAR"
  }
};
```

## WebSite Schema

The WebSite schema provides search engines with information about your job board as a whole. This schema is automatically injected into every page of your site.

### Key Properties

- `name` - Your job board name (from `config.nav.title`)
- `url` - Your site URL (from `config.url`)
- `description` - Site description (from `config.description`)
- `publisher` - Organization information
- `sameAs` - Social media links
- `potentialAction` - Search functionality

### Implementation Details

The WebSite schema is implemented in the `WebsiteSchema` component:

```typescript
export function WebsiteSchema() {
  // Get base values from existing config
  const baseUrl = config.url || process.env.NEXT_PUBLIC_APP_URL || "https://bordful.com";
  const siteName = config.nav.title;
  const siteDescription = config.description;

  // If there is no site name or URL, we can't create a valid schema
  if (!siteName || !baseUrl) {
    return null;
  }

  // Derive social links from navigation settings
  const socialLinks = [];
  if (config.nav.github?.show && config.nav.github?.url)
    socialLinks.push(config.nav.github.url);
  if (config.nav.linkedin?.show && config.nav.linkedin?.url)
    socialLinks.push(config.nav.linkedin.url);
  if (config.nav.twitter?.show && config.nav.twitter?.url)
    socialLinks.push(config.nav.twitter.url);
  if (config.nav.bluesky?.show && config.nav.bluesky?.url)
    socialLinks.push(config.nav.bluesky.url);
  if (config.nav.reddit?.show && config.nav.reddit?.url)
    socialLinks.push(config.nav.reddit.url);

  // Build the schema data object
  const schemaData: WithContext<WebSite> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: baseUrl,
    description: siteDescription,
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: config.nav.logo?.enabled ? `${baseUrl}${config.nav.logo.src}` : undefined
    },
    sameAs: socialLinks.length > 0 ? socialLinks : undefined,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/jobs?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemaData),
      }}
    />
  );
}
```

## AboutPage Schema

The AboutPage schema is implemented for the about page, providing search engines with structured information about your organization.

### Implementation Details

```typescript
export const AboutSchema: FC<AboutSchemaProps> = ({
  companyName = config.title,
  description = "Learn about our mission to connect talented professionals with exciting career opportunities.",
  url = `${config.url}/about` || "https://example.com/about",
  logo = config.nav?.logo?.enabled
    ? `${config.url}${config.nav.logo.src}`
    : undefined,
}) => {
  // Create type-safe schema using schema-dts
  const aboutSchema: WithContext<AboutPage> = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${companyName}`,
    description: description,
    mainEntity: {
      "@type": "Organization",
      name: companyName,
      description: description,
      url: config.url,
      ...(logo && { logo }),
    },
    url: url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
    />
  );
};
```

## BreadcrumbList Schema

Breadcrumb structured data helps search engines understand the hierarchical structure of your site.

### Implementation Details

```typescript
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): string {
  interface SchemaListItem {
    "@type": string;
    position: number;
    name: string;
    item?: string;
  }

  // Create type-safe schema using schema-dts
  const breadcrumbSchema: WithContext<BreadcrumbList> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const isLastItem = index === items.length - 1;
      const listItem: SchemaListItem = {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
      };

      // For the last item, omit the item property entirely
      // For other items, use a simple URL string with the full URL
      if (!isLastItem) {
        listItem.item = `${config.url}${item.url}`;
      }

      return listItem as ListItem;
    }),
  };

  return JSON.stringify(breadcrumbSchema);
}
```

## Type Safety with schema-dts

Bordful uses the [schema-dts](https://github.com/google/schema-dts) package to provide TypeScript type definitions for Schema.org structured data. This offers several advantages:

- **Type Safety**: Early detection of schema errors during development
- **Auto-completion**: IDE support for all schema.org properties and types
- **Validation**: Ensures the schema follows the correct structure
- **Maintainability**: Easier to update and extend with proper type checking

### Usage Example

```typescript
import type {
  JobPosting,
  WithContext,
  MonetaryAmount,
  QuantitativeValue,
  Organization,
  Place,
  PostalAddress,
  Country,
} from "schema-dts";

// Create a type-safe schema object
const jobPostingSchema: WithContext<JobPosting> = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: job.title,
  description: job.description,
  // Other properties...
};
```

## Airtable Integration

The schema implementation maps directly to fields in your Airtable base. Here's how to set up your Airtable base for optimal schema integration:

### Required Fields

| Field Name    | Field Type       | Description      |
| ------------- | ---------------- | ---------------- |
| `title`       | Single line text | Job title        |
| `description` | Long text        | Job description  |
| `company`     | Single line text | Company name     |
| `posted_date` | Date             | Publication date |

### Recommended Fields

| Field Name        | Field Type       | Description                                  |
| ----------------- | ---------------- | -------------------------------------------- |
| `valid_through`   | Date             | Expiration date                              |
| `job_type`        | Multiple select  | Employment type (FULL_TIME, PART_TIME, etc.) |
| `location`        | Single line text | Job location                                 |
| `remote`          | Checkbox         | Whether the job is remote                    |
| `remote_regions`  | Multiple select  | Allowed regions for remote work              |
| `salary_min`      | Number           | Minimum salary                               |
| `salary_max`      | Number           | Maximum salary                               |
| `salary_currency` | Single select    | Salary currency code                         |
| `salary_period`   | Single select    | Pay period (YEAR, MONTH, WEEK, HOUR)         |
| `skills`          | Multiple select  | Required skills                              |
| `qualifications`  | Long text        | Required qualifications                      |
| `experience`      | Long text        | Experience requirements                      |
| `industry`        | Single line text | Industry category                            |
| `category`        | Single line text | Occupational category                        |
| `benefits`        | Long text        | Job benefits                                 |
| `direct_apply`    | Checkbox         | Whether direct application is available      |

## Customizing Schema Implementation

You can customize the schema implementation in several ways:

### 1. Configuration-Based Customization

Update your `config/config.ts` file to change how the WebSite and AboutPage schemas are generated:

```typescript
// config/config.ts
export const config = {
  title: "Your Job Board",
  description: "Your site description",
  url: "https://example.com",
  nav: {
    title: "Your Site Name",
    logo: {
      enabled: true,
      src: "/logo.svg",
      // Other logo properties...
    },
    // Social media links affect the sameAs property
    github: { show: true, url: "https://github.com/yourusername" },
    linkedin: { show: true, url: "https://linkedin.com/company/yourcompany" },
    twitter: { show: true, url: "https://twitter.com/yourhandle" },
    // Other social links...
  },
  // SEO configuration affects schema generation
  seo: {
    googleJobs: {
      enabled: true,
      enhancedStructuredData: true,
      defaultEmploymentType: "FULL_TIME",
      defaultJobLocationType: "TELECOMMUTE",
    },
  },
};
```

### 2. Component-Level Customization

You can modify the schema components in the `components/ui/` directory to change how structured data is generated:

- `job-schema.tsx` - JobPosting schema implementation
- `website-schema.tsx` - WebSite schema implementation
- `about-schema.tsx` - AboutPage schema implementation
- `metadata-breadcrumb.tsx` - BreadcrumbList implementation

### 3. Airtable Field Mapping

You can adjust how Airtable fields map to schema properties by modifying the `lib/db/airtable.ts` file, particularly the field normalization functions.

## Google Jobs Integration

Bordful's schema implementation is specifically designed to be compatible with Google Jobs, enabling your job listings to appear in Google's job search results.

### Google Jobs Requirements

For Google Jobs compatibility, ensure the following:

1. Each job has a valid `title`, `description`, `datePosted`, and `hiringOrganization`
2. Include `jobLocation` (or `jobLocationType` for remote jobs)
3. Specify `employmentType` (FULL_TIME, PART_TIME, etc.)
4. Include `baseSalary` with currency and value range where possible
5. Set a valid `validThrough` date to indicate when the listing expires

### Enhanced Structured Data

Enable enhanced structured data in your configuration:

```typescript
// config/config.ts
seo: {
  googleJobs: {
    enabled: true,
    enhancedStructuredData: true,
    defaultEmploymentType: "FULL_TIME",
    defaultJobLocationType: "TELECOMMUTE",
  },
},
```

## SEO Benefits

Implementing proper schema.org structured data provides several SEO benefits:

- **Rich Results**: Better display in search results with structured salary, location, and company information
- **Improved Click-Through Rate**: More informative search listings lead to higher CTR
- **Better User Matching**: Proper structured data helps search engines match jobs to relevant candidates
- **Google Jobs Integration**: Jobs can appear in Google's job search interface
- **Enhanced Knowledge Graph**: Helps search engines understand your organization

## Testing Your Schema

You can validate your schema implementation using these tools:

1. [Google's Rich Results Test](https://search.google.com/test/rich-results)
2. [Schema.org Validator](https://validator.schema.org/)
3. [Structured Data Testing Tool](https://www.schemaapp.com/tools/structured-data-testing-tool/)

### Testing Process

1. Deploy your site or use a public development URL
2. Enter the URL of a job listing page in the testing tool
3. Verify that the JobPosting schema is correctly identified
4. Check for any errors or warnings
5. Test other page types (home page, about page) to verify other schema types

## Example Schema Output

### JobPosting Example

```json
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Senior Software Engineer",
  "description": "We're looking for a senior software engineer...",
  "datePosted": "2025-03-01T00:00:00.000Z",
  "validThrough": "2025-04-01T00:00:00.000Z",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Example Company"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "addressCountry": "USA"
    }
  },
  "employmentType": "FULL_TIME",
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 120000,
      "maxValue": 150000,
      "unitText": "YEAR"
    }
  },
  "skills": "React, TypeScript, Node.js",
  "qualifications": "Bachelor's degree in Computer Science or related field",
  "experienceRequirements": "5+ years of software development experience",
  "industry": "Software Development",
  "occupationalCategory": "15-1252.00 Software Developers",
  "jobBenefits": "Medical, dental, vision insurance, 401(k) matching, unlimited PTO",
  "directApply": false
}
```

### WebSite Example

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Bordful",
  "url": "https://bordful.com",
  "description": "Browse curated opportunities from leading companies. Updated daily with the latest positions.",
  "publisher": {
    "@type": "Organization",
    "name": "Bordful",
    "logo": "https://bordful.com/logo.png"
  },
  "sameAs": [
    "https://twitter.com/bordful",
    "https://github.com/craftled/bordful",
    "https://linkedin.com/company/bordful"
  ],
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://bordful.com/jobs?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

## Related Documentation

- [SEO Guide](/docs/guides/seo.md) - Guide to optimizing your job board for search engines
- [Airtable Setup](/docs/getting-started/airtable-setup.md) - Guide to setting up your Airtable base
- [Job Listings Documentation](/docs/guides/job-listings.md) - Guide to configuring job listings 