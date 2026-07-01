---
title: Job Filtering System
description: Learn how to configure and customize the comprehensive job filtering system in your Bordful job board.
lastUpdated: "2025-05-22"
---

# Job Filtering System

Bordful includes a comprehensive filtering system that allows users to narrow down job listings based on various criteria. This guide explains how the filtering system works and how to customize it.

## Overview

The filtering system supports multiple filter types:

- **Job Types**: Filter by employment type (full-time, part-time, contract, etc.)
- **Career Levels**: Filter by seniority or role level
- **Remote Work**: Filter for remote-friendly positions
- **Salary Ranges**: Filter by compensation ranges
- **Visa Sponsorship**: Filter for jobs that offer visa sponsorship
- **Languages**: Filter by required language skills
- **Search**: Full-text search across job titles, companies, and locations

All filters feature URL parameter persistence, allowing users to share filtered views and maintain their selections during navigation.

## Configuration

Filtering options are configured in the `config/config.ts` file:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  filtering: {
    // Enable/disable the filtering system
    enabled: true,
    
    // Configure which filters are available
    filters: {
      jobTypes: true,
      careerLevels: true,
      remote: true,
      salary: true,
      visa: true,
      languages: true,
    },
    
    // Salary range presets for filtering
    salaryRanges: [
      { label: "Under $50k", min: 0, max: 50000 },
      { label: "$50k - $80k", min: 50000, max: 80000 },
      { label: "$80k - $120k", min: 80000, max: 120000 },
      { label: "$120k - $160k", min: 120000, max: 160000 },
      { label: "$160k+", min: 160000, max: null },
    ],
    
    // Default selected filters when user first visits
    defaultFilters: {
      types: [],
      roles: [],
      remote: false,
      salaryRanges: [],
      visa: false,
      languages: [],
    },
  },
  // ... other configuration
};
```

## Filter Types

### Job Types Filter

Allows users to filter jobs by employment type. Supports:

- Full-time
- Part-time
- Contract
- Freelance
- Internship
- Temporary

The filter displays the count of jobs for each type and updates dynamically based on other applied filters.

### Career Levels Filter

Filters jobs based on career level or seniority. Supports 18 standardized levels including:

- Internship
- Entry Level
- Junior
- Mid Level
- Senior
- Manager
- Director
- C-Level
- Founder

Each level shows the number of matching jobs.

### Remote Work Filter

Simple toggle to filter for remote-friendly positions. Shows the count of remote jobs available.

### Salary Ranges Filter

Filters jobs based on predefined salary ranges. The ranges are configurable in the `salaryRanges` section of the configuration.

Features:
- Automatic salary normalization (converts all salaries to annual USD equivalent)
- Support for different currencies and time units (hourly, monthly, etc.)
- Smart handling of salary ranges (min, max, or both)

### Visa Sponsorship Filter

Toggle to show only jobs that offer visa sponsorship. This is determined by the `visa_sponsorship` field in the job data.

### Languages Filter

Filters jobs based on required language skills. Shows all languages present in the job listings with counts for each.

Supports all 184 ISO 639-1 language codes with proper display names.

## URL Parameter Persistence

All filter selections are automatically saved in the URL as query parameters, enabling:

- Shareable filtered views
- Bookmark support
- Navigation history
- Filter persistence during page navigation

### URL Parameter Format

| Filter Type   | URL Parameter | Format                 | Example                   |
| ------------- | ------------- | ---------------------- | ------------------------- |
| Job Types     | `types`       | Comma-separated values | `types=fulltime,contract` |
| Career Levels | `roles`       | Comma-separated values | `roles=Senior,Manager`    |
| Remote Work   | `remote`      | Boolean                | `remote=true`             |
| Salary Ranges | `salary`      | Comma-separated values | `salary=50k-80k,80k-120k` |
| Visa          | `visa`        | Boolean                | `visa=true`               |
| Languages     | `languages`   | Comma-separated codes  | `languages=en,fr,de`      |
| Search        | `q`           | URL-encoded string     | `q=software%20engineer`   |

## Mobile Responsiveness

The filtering system is fully responsive:

- On desktop: Filters appear in a sidebar next to job listings
- On mobile: Filters collapse into an expandable panel
- Filter counts remain visible on all screen sizes
- Touch-friendly toggle and checkbox controls

## Implementation Details

The filtering system is implemented across several components:

- `components/ui/job-filters.tsx`: Main filters UI component
- `components/jobs/JobsLayout.tsx`: Layout component that manages filter state
- `lib/utils/filter-jobs.ts`: Utility functions for filtering jobs

Each filter type is implemented as a reusable component with:
- Consistent UI for selected/unselected states
- Dynamic job counts
- Accessible controls (ARIA attributes, keyboard navigation)
- URL parameter synchronization

### Filter Logic

The filtering system applies filters in sequence:

1. **Search filter** is applied first to all jobs
2. **Type filters** are applied to the search results
3. **Career level filters** are applied next
4. **Remote filter** is applied if enabled
5. **Salary filters** are applied with normalization
6. **Visa filter** is applied if enabled
7. **Language filters** are applied last

This sequence ensures consistent and predictable filtering behavior.

## Best Practices

1. **Default Filters**: Configure sensible default filters based on your most common use cases
2. **Filter Order**: Arrange filters from most used to least used for better UX
3. **Salary Ranges**: Create meaningful salary ranges that reflect your job market
4. **Field Consistency**: Ensure your Airtable data includes all filterable fields
5. **Performance**: For large job boards (500+ listings), consider server-side filtering

## Related Documentation

- [Job Listings Configuration](/docs/guides/job-listings.md)
- [Pagination and Sorting](/docs/reference/pagination-sorting.md)
- [Salary Structure](/docs/reference/salary-structure.md)
- [URL Parameters](/docs/reference/pagination-sorting.md#url-parameters)
- [Enhanced Language System](/docs/reference/language-system.md) 