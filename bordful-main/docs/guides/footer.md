---
title: Footer Customization
description: Configure and customize the footer structure and content for your Bordful job board.
lastUpdated: "2025-05-22"
---

Bordful's footer is fully customizable to match your branding and provide users with important links and information about your job board.

## Key Features

- Multi-column layout with customizable sections
- Company/brand information display
- Configurable link columns for navigation, resources, and legal
- Bottom bar with copyright notice and optional social icons
- Mobile-responsive design that adjusts for various screen sizes
- Configurable via a single configuration file

## Footer Configuration

The footer is configured in the `footer` section of your `config/config.ts` file:

```typescript
footer: {
  // Company/brand information
  brand: {
    name: "Your Company", // Company name in footer
    description: "Brief description of your company or job board", // Short tagline
    showLogo: true, // Whether to show the logo in footer
  },
  
  // Footer columns
  columns: [
    {
      title: "Navigation",
      links: [
        { label: "Home", href: "/" },
        { label: "Jobs", href: "/jobs" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "FAQ", href: "/faq" },
        { label: "Job Alerts", href: "/job-alerts" },
        { label: "RSS Feed", href: "/feed.xml" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookies", href: "/cookies" },
      ],
    },
  ],
  
  // Bottom bar with copyright and additional links
  bottom: {
    copyright: "© 2025 Your Company. All rights reserved.",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
    showSocialIcons: true, // Whether to show social icons in footer
  },
}
```

## Brand Section

The top section of the footer can display your company or job board brand information:

```typescript
brand: {
  name: "Your Company", // Company name in footer
  description: "Brief description of your company or job board", // Short tagline
  showLogo: true, // Whether to show the logo in footer
}
```

If `showLogo` is set to `true`, the footer will display the same logo as configured in the navigation section. If you're using icon+text in the navigation, the footer will display the icon.

## Footer Columns

The main section of the footer consists of multiple columns, each with a title and a list of links:

```typescript
columns: [
  {
    title: "Navigation",
    links: [
      { label: "Home", href: "/" },
      { label: "Jobs", href: "/jobs" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  // Add more columns as needed
]
```

You can add as many columns as you need, but for optimal mobile display, we recommend 2-4 columns.

### Common Column Types

While you can name your columns anything you want, here are some common column types:

1. **Navigation**: Main site navigation links
2. **Resources**: Helpful resources for job seekers
3. **For Employers**: Links relevant to employers
4. **Legal**: Privacy policy, terms of service, etc.
5. **Contact**: Contact information and social links

## Bottom Bar

The bottom bar of the footer contains copyright information and optional additional links:

```typescript
bottom: {
  copyright: "© 2025 Your Company. All rights reserved.",
  links: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
  showSocialIcons: true, // Whether to show social icons in footer
}
```

If `showSocialIcons` is set to `true`, the social media icons configured in the navigation section will also appear in the footer's bottom bar.

## Mobile Responsiveness

The footer automatically adapts to different screen sizes:

- **Desktop**: Multi-column layout with brand information at the top
- **Tablet**: Columns may reduce or stack depending on screen width
- **Mobile**: Stacked columns with appropriate spacing

No additional configuration is required for mobile support.

## Customization Examples

### Minimal Footer

```typescript
footer: {
  brand: {
    name: "JobBoard",
    description: "",
    showLogo: false,
  },
  columns: [
    {
      title: "Links",
      links: [
        { label: "Home", href: "/" },
        { label: "Jobs", href: "/jobs" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ],
  bottom: {
    copyright: "© 2025 JobBoard. All rights reserved.",
    links: [],
    showSocialIcons: false,
  },
}
```

### Company-Focused Footer

```typescript
footer: {
  brand: {
    name: "Enterprise Corp",
    description: "Leading provider of enterprise job solutions since 2010",
    showLogo: true,
  },
  columns: [
    {
      title: "Our Products",
      links: [
        { label: "Job Board", href: "/" },
        { label: "Applicant Tracking", href: "/ats" },
        { label: "Resume Parser", href: "/parser" },
        { label: "API Access", href: "/api" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "Pricing", href: "/pricing" },
        { label: "Blog", href: "/blog" },
        { label: "Support", href: "/support" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
        { label: "Press", href: "/press" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookie Policy", href: "/cookies" },
        { label: "GDPR", href: "/gdpr" },
      ],
    },
  ],
  bottom: {
    copyright: "© 2025 Enterprise Corp. All rights reserved.",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
    showSocialIcons: true,
  },
}
```

## Best Practices

1. **Consistent Navigation**: Ensure footer links are consistent with top navigation
2. **Logical Grouping**: Group related links into clearly labeled columns
3. **Concise Labels**: Keep link labels short and descriptive
4. **Accessibility**: Ensure sufficient color contrast for footer text
5. **Completeness**: Include all essential legal and informational links

## Implementation Details

The footer is implemented in `components/ui/footer.tsx`, which reads the configuration from `config/config.ts` and renders the appropriate structure.

## Related Documentation

- [Navigation Customization](/docs/guides/navigation.md)
- [Logo Customization](/docs/guides/logo-customization.md)
- [Theming and Color Customization](/docs/guides/theming-customization.md)
- [Configuration Options](/docs/reference/configuration-options.md) 