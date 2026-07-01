---
title: Pagination, Sorting, and URL Parameters
description: Comprehensive guide to Bordful's pagination system, sorting options, and URL parameter handling.
lastUpdated: "2025-05-22"
---

# Pagination, Sorting, and URL Parameters

Bordful includes a comprehensive pagination and sorting system that enhances user experience, improves SEO, and provides powerful URL-based state management. This document explains how these features work and how they can be customized.

## Pagination System

### Overview

Bordful's pagination system is designed to be:

- **User-friendly**: Clear navigation between pages of job listings
- **SEO-optimized**: URL-based for better search engine indexing
- **Responsive**: Works well on mobile and desktop devices
- **Performant**: Efficiently loads only the data needed for each page

### Key Features

#### URL-Based Pagination

Unlike client-side pagination solutions that don't update the URL, Bordful's pagination system maintains state in the URL:

```
/jobs?page=2&per_page=25
```

This approach provides several benefits:
- Users can bookmark specific pages
- Browser back/forward navigation works correctly
- Search engines can properly index all pages
- Pages can be shared with the exact same view

#### Configurable Items Per Page

Users can select how many items to display per page through a dropdown selector:

- 10 items (default)
- 25 items
- 50 items
- 100 items

This setting is also reflected in the URL via the `per_page` parameter.

#### Elegant Pagination UI

The pagination interface includes:

- Previous/Next buttons
- Numbered page buttons
- Current page indication
- Ellipsis (...) for large page counts
- Disabled state for unavailable navigation

For large result sets, the UI intelligently displays a subset of page numbers with ellipsis:

```
← 1 2 3 ... 50 →   (when on page 2 of 50)
← 1 ... 10 11 12 ... 50 →   (when on page 11 of 50)
← 1 ... 48 49 50   (when on page 49 of 50)
```

#### Zero Page Jumps

The pagination system prevents jarring page jumps when:
- Changing page numbers
- Adjusting items per page
- Applying or removing filters
- Changing sort order

This is achieved through optimized state management and controlled scrolling behavior.

### Implementation Details

Bordful uses several components and hooks to implement pagination:

1. **PaginationControl**: UI component for displaying page navigation
2. **usePagination**: Custom hook for managing pagination state
3. **JobsPerPageSelect**: Dropdown for selecting items per page

The pagination state is managed through the URL search parameters and synchronized with the React component state.

## Sorting Options

### Available Sort Options

Bordful supports the following sort options for job listings:

| Option | Description                     | URL Parameter |
| ------ | ------------------------------- | ------------- |
| Newest | Most recently posted jobs first | `sort=newest` |
| Oldest | Oldest jobs first               | `sort=oldest` |
| Salary | Highest salary first            | `sort=salary` |

The sort order is reflected in the URL and maintained when navigating between pages.

### Salary-Based Sorting

When sorting by salary, Bordful performs intelligent normalization:

1. All salaries are converted to annual amounts
2. All currencies are normalized to USD using current exchange rates
3. For salary ranges, sorting uses the midpoint of the range
4. Cryptocurrencies are converted based on current market rates

This ensures that salary sorting provides meaningful results regardless of currency or payment frequency.

### Default Sorting

By default, jobs are sorted by `newest` to show the most recent listings first. This can be customized in the configuration file:

```typescript
// config/config.ts
jobListing: {
  // Default sort order
  defaultSort: "newest" as SortOption,
  // ... other settings
}
```

## URL Parameters

Bordful uses URL parameters extensively for maintaining state, enabling bookmarks, and sharing specific views.

### Core Parameters

| Parameter   | Description                           | Example Values                 |
| ----------- | ------------------------------------- | ------------------------------ |
| `page`      | Current page number                   | `1`, `2`, `3`                  |
| `per_page`  | Items per page                        | `10`, `25`, `50`, `100`        |
| `sort`      | Sort order                            | `newest`, `oldest`, `salary`   |
| `types`     | Comma-separated job types             | `Full-time,Part-time,Contract` |
| `roles`     | Comma-separated career levels         | `Senior,Lead,Manager`          |
| `remote`    | Remote work filter                    | `true`                         |
| `salary`    | Comma-separated salary ranges         | `50K-100K,100K-200K`           |
| `visa`      | Visa sponsorship filter               | `true`                         |
| `languages` | Comma-separated language requirements | `en,fr,de`                     |

### Example URLs

Here are examples of how URL parameters can be combined:

```
# Jobs with specific types and roles, remote-only
/?types=Full-time,Contract&roles=Senior,Lead&remote=true

# Jobs with specific salary ranges, with visa sponsorship, on page 2
/?salary=50K-100K,100K-200K&visa=true&page=2

# Jobs sorted by salary, with 25 items per page
/?sort=salary&per_page=25

# Senior and lead developer jobs with specific language requirements
/?roles=Senior,Lead&languages=en,de&types=Full-time
```

### Parameter Parsing

Bordful handles URL parameters intelligently:

1. **Array Parameters**: Comma-separated values like `types=Full-time,Contract` are parsed into arrays
2. **Boolean Parameters**: Values like `remote=true` are converted to boolean
3. **Range Parameters**: Values like `salary=50K-100K,100K-200K` are parsed into structured range objects
4. **Number Parameters**: Values like `page=2` are converted to numbers

This parsing is handled on both client and server sides for consistent behavior.

## Customization Options

### Configuration File

You can customize the pagination and sorting behavior in the configuration file:

```typescript
// config/config.ts
jobListing: {
  // Pagination settings
  pagination: {
    // Default items per page
    defaultPerPage: 10,
    
    // Available items per page options
    perPageOptions: [10, 25, 50, 100],
    
    // Maximum number of page buttons to show
    maxPageButtons: 5,
    
    // Show "First" and "Last" page buttons
    showFirstLastButtons: false,
  },
  
  // Sorting settings
  sorting: {
    // Default sort order
    defaultSort: "newest" as SortOption,
    
    // Available sort options (can be subset of all options)
    availableSortOptions: ["newest", "oldest", "salary"] as SortOption[],
    
    // Show sort dropdown on mobile
    showSortOnMobile: true,
  },
}
```

### Component Customization

The pagination UI can be customized by modifying the related components:

- `components/ui/pagination.tsx` - Core pagination UI components
- `components/ui/pagination-control.tsx` - Pagination control with page numbers
- `components/ui/jobs-per-page-select.tsx` - Items per page selector

### URL Parameter Handling

You can customize URL parameter handling in:

- `lib/hooks/usePagination.ts` - Hook for pagination state management
- `lib/hooks/useFilters.ts` - Hook for filter parameter management
- `lib/hooks/useSorting.ts` - Hook for sort parameter management

## Best Practices

1. **Preserve URL Parameters**: When generating internal links, preserve existing URL parameters to maintain user context.

2. **Combine with Filters**: Pagination works best when combined with filtering to help users narrow down results.

3. **Reset to Page 1**: When filters change, reset pagination to page 1 to avoid empty result pages.

4. **Consider Mobile UX**: Ensure pagination controls are touch-friendly and work well on smaller screens.

5. **Optimize Performance**: For large result sets, implement server-side pagination to minimize data transfer.

## Implementation Examples

### Adding Pagination to a Custom Page

To add pagination to a custom page:

```tsx
import { usePagination } from "@/lib/hooks/usePagination";
import { PaginationControl } from "@/components/ui/pagination-control";

export default function CustomPage() {
  const { page, perPage } = usePagination();
  
  // Calculate offset for data fetching
  const offset = (page - 1) * perPage;
  
  // Fetch data with pagination
  const { data, totalItems } = useData(offset, perPage);
  
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / perPage);
  
  return (
    <div>
      {/* Your content here */}
      
      {/* Pagination controls */}
      <PaginationControl 
        totalItems={totalItems} 
        totalPages={totalPages} 
      />
    </div>
  );
}
```

### Custom Sorting Implementation

To implement custom sorting:

```tsx
import { useSorting } from "@/lib/hooks/useSorting";

export default function CustomSortPage() {
  const { sort, setSort } = useSorting();
  
  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "alphabetical", label: "A-Z" },
  ];
  
  return (
    <div>
      <select 
        value={sort} 
        onChange={(e) => setSort(e.target.value)}
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Your sorted content here */}
    </div>
  );
}
```

## Related Documentation

- [URL-Based Filtering](/docs/guides/filtering-system.md)
- [Job Listing Configuration](/docs/reference/job-listing-configuration.md)
- [Search Implementation](/docs/reference/search-implementation.md)
- [Salary Structure](/docs/reference/salary-structure.md) 