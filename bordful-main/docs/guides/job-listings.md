---
title: Job Listings Configuration
description: Learn how to configure, customize, and manage job listings on your Bordful job board.
lastUpdated: "2025-05-22"
---

# Job Listings Configuration

This guide explains how to configure and customize job listings on your Bordful job board.

## Overview

Bordful's job listings system features:

- Customizable job cards with hover effects
- Detailed job pages with rich content
- Featured job highlighting
- Similar jobs recommendations
- Comprehensive status management
- Sorting and filtering options

## Configuration

Job listings are configured in the `jobListing` section of your `config/config.ts` file:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  jobListing: {
    // Number of jobs per page
    jobsPerPage: 10,
    
    // Default sort order ("newest", "oldest", "salary")
    defaultSort: "newest",
    
    // Show/hide similar jobs on job detail pages
    showSimilarJobs: true,
    
    // Number of similar jobs to display
    similarJobsCount: 3,
    
    // Show/hide expired jobs (past valid_through date)
    showExpiredJobs: false,
    
    // Card display options
    cards: {
      // Show company logo on cards
      showLogo: true,
      
      // Show salary on cards
      showSalary: true,
      
      // Show posted date on cards
      showDate: true,
      
      // Show location on cards
      showLocation: true,
      
      // Show job type on cards
      showType: true,
      
      // Display configuration for apply button on hover
      applyButton: {
        show: true,
        label: "Apply Now",
        variant: "default", // "default", "outline", "secondary"
      },
    },
    
    // Detail page configuration
    detailPage: {
      // Show company logo on detail page
      showLogo: true,
      
      // Show company name on detail page
      showCompany: true,
      
      // Show apply button at top of page
      showTopApplyButton: true,
      
      // Show apply button at bottom of page
      showBottomApplyButton: true,
      
      // Apply button label
      applyButtonLabel: "Apply for This Position",
      
      // Show post date
      showPostDate: true,
      
      // Show application deadline
      showDeadline: true,
      
      // Show job benefits section
      showBenefits: true,
      
      // Show application requirements section
      showRequirements: true,
      
      // Show sidebar with job metadata
      showSidebar: true,
      
      // Show job identifier in sidebar
      showJobIdentifier: true,
    },
  },
  // ... other configuration
};
```

## Job Cards

Job cards appear on the main jobs listing page and category pages. Each card displays key job information and has hover effects.

### Card Structure

```
┌─────────────────────────────────────┐
│ [Featured]           [Posted Date]  │
│ Job Title                           │
│ Company Name                        │
│                                     │
│ Location • Job Type • Salary        │
│                        [Apply Now]  │
└─────────────────────────────────────┘
```

### Card Customization

You can customize which elements appear on job cards:

```typescript
cards: {
  // Show/hide elements
  showLogo: true,
  showSalary: true,
  showDate: true,
  showLocation: true,
  showType: true,
  
  // Apply button customization
  applyButton: {
    show: true,
    label: "Apply Now",
    variant: "default",
  },
}
```

## Job Detail Pages

Job detail pages display comprehensive information about a job posting.

### Detail Page Sections

1. **Header**: Job title, company, location, and apply button
2. **Main Content**: Job description (rich text)
3. **Sidebar**: Job metadata, benefits, requirements
4. **Bottom**: Secondary apply button, similar jobs

### Detail Page Customization

Configure which elements appear on job detail pages:

```typescript
detailPage: {
  showLogo: true,
  showCompany: true,
  showTopApplyButton: true,
  showBottomApplyButton: true,
  applyButtonLabel: "Apply for This Position",
  showPostDate: true,
  showDeadline: true,
  showBenefits: true,
  showRequirements: true,
  showSidebar: true,
  showJobIdentifier: true,
}
```

## Featured Jobs

Featured jobs receive special styling and prioritized placement in listings.

### Enabling Featured Jobs

In Airtable, add a `featured` checkbox field to your jobs table.

### Featured Job Styling

Featured jobs display with:
- Featured badge in the top-left corner
- Subtle highlight border
- Priority placement in default sort order

## Similar Jobs

Bordful can display related job recommendations on job detail pages.

### Similar Jobs Configuration

```typescript
jobListing: {
  // Enable/disable similar jobs
  showSimilarJobs: true,
  
  // Number of similar jobs to display
  similarJobsCount: 3,
}
```

### Recommendation Algorithm

Similar jobs are determined by:
1. Matching job title keywords
2. Same location/company
3. Same job type
4. Recency and active status

## Job Status Management

Bordful includes comprehensive job status management:

- **Active/Inactive**: Set via `status` field in Airtable
- **Expiration**: Automatic via `valid_through` date
- **SEO Handling**: Proper 404 responses for inactive jobs

### Status Configuration

```typescript
jobListing: {
  // Show/hide expired jobs (past valid_through date)
  showExpiredJobs: false,
}
```

## Best Practices

1. **Job Titles**: Use clear, concise titles without excessive capitalization
2. **Job Descriptions**: Format with headings, lists, and short paragraphs
3. **Benefits**: List key benefits as bullet points for easy scanning
4. **Salary Information**: Provide transparent salary ranges
5. **Deadlines**: Set reasonable application deadlines to create urgency
6. **Requirements**: Clearly state required vs. preferred qualifications
7. **Featured Jobs**: Use sparingly for truly premium or urgent positions
8. **Job Identifiers**: Use consistent formatting for job reference codes

## Implementation Details

The job listings system is implemented across multiple components:

- `app/jobs/page.tsx`: Main job listings page
- `app/jobs/[slug]/page.tsx`: Individual job detail page
- `components/jobs/JobCard.tsx`: Job card component
- `components/jobs/JobsList.tsx`: Job list container
- `components/ui/job-details-sidebar.tsx`: Job metadata sidebar
- `components/ui/similar-jobs.tsx`: Similar jobs component

## Related Documentation

- [Filtering System](/docs/guides/filtering-system.md)
- [Pagination and Sorting](/docs/reference/pagination-sorting.md)
- [Salary Structure](/docs/reference/salary-structure.md)
- [Schema Implementation](/docs/advanced/schema-implementation.md)
- [Airtable Setup](/docs/getting-started/airtable-setup.md) 