---
title: Post Job Banner Customization
description: Learn how to configure and customize the post job banner that appears in the job detail sidebar.
lastUpdated: "2025-05-22"
---

# Post Job Banner Customization

The post job banner is a configurable component that appears in the sidebar of job detail pages, encouraging employers to post job listings. This guide explains how to configure and customize this component to match your business model and branding.

## Overview

The post job banner provides these key benefits:

- Promotes your job posting services to potential employers
- Displays social proof with company avatars
- Includes a clear call to action
- Can be customized or disabled based on your needs

## Configuration Options

The banner is configured in your `config/config.ts` file under the `postJobBanner` section:

```typescript
postJobBanner: {
  // Enable or disable the post job banner
  enabled: true,

  // Banner content
  title: "Hiring? Post Your Job Ad Here",
  description: "Reach talented professionals. Get quality applications fast.",

  // Trust indicators
  showTrustedBy: true,
  trustedByText: "Trusted by top companies",
  companyAvatars: [
    {
      src: "/avatars/company1.png",
      alt: "Company 1",
      fallback: "C1",
    },
    // ... more company avatars
  ],

  // Call to action
  cta: {
    text: "Post a Job ($59)",
    link: "https://your-payment-link.com",
    external: true,
  },

  // Trust message
  trustMessage: "30-day money-back guarantee",
}
```

### Basic Settings

| Setting       | Type    | Description                                       |
| ------------- | ------- | ------------------------------------------------- |
| `enabled`     | Boolean | Toggles the banner visibility throughout the site |
| `title`       | String  | The main heading of the banner                    |
| `description` | String  | A brief description of your value proposition     |

### Trust Indicators

| Setting          | Type    | Description                            |
| ---------------- | ------- | -------------------------------------- |
| `showTrustedBy`  | Boolean | Toggles the company avatars section    |
| `trustedByText`  | String  | Text displayed next to company avatars |
| `companyAvatars` | Array   | List of company avatar configurations  |

Each company avatar object in the `companyAvatars` array has these properties:

| Property   | Type   | Description                            |
| ---------- | ------ | -------------------------------------- |
| `src`      | String | Path to the avatar image file          |
| `alt`      | String | Alt text for accessibility             |
| `fallback` | String | Text to display if image fails to load |

### Call to Action

The `cta` object controls the action button:

| Property   | Type    | Description                         |
| ---------- | ------- | ----------------------------------- |
| `text`     | String  | Button text (can include pricing)   |
| `link`     | String  | URL the button links to             |
| `external` | Boolean | Whether the link opens in a new tab |

### Trust Message

| Setting        | Type   | Description                                                               |
| -------------- | ------ | ------------------------------------------------------------------------- |
| `trustMessage` | String | Text displayed below the CTA button, often a guarantee or trust statement |

## Implementation Examples

### Standard Configuration

```typescript
postJobBanner: {
  enabled: true,
  title: "Hiring? Post Your Job Ad Here",
  description: "Reach talented professionals. Get quality applications fast.",
  showTrustedBy: true,
  trustedByText: "Trusted by top companies",
  companyAvatars: [
    {
      src: "/avatars/company1.png",
      alt: "Company 1",
      fallback: "C1",
    },
    {
      src: "/avatars/company2.png",
      alt: "Company 2",
      fallback: "C2",
    },
    {
      src: "/avatars/company3.png",
      alt: "Company 3",
      fallback: "C3",
    },
  ],
  cta: {
    text: "Post a Job ($59)",
    link: "https://your-payment-link.com",
    external: true,
  },
  trustMessage: "30-day money-back guarantee",
}
```

### Minimal Configuration

```typescript
postJobBanner: {
  enabled: true,
  title: "Post a Job",
  description: "Get your job in front of qualified candidates.",
  showTrustedBy: false,
  cta: {
    text: "Learn More",
    link: "/pricing",
    external: false,
  },
  trustMessage: "",
}
```

### Disabling the Banner

To completely disable the post job banner:

```typescript
postJobBanner: {
  enabled: false,
  // Other settings will be ignored when disabled
}
```

## Best Practices

### Images

For company avatars:

- Use square images for consistency
- Recommended size: 64×64 pixels
- Place images in the `public/avatars/` directory
- Use PNG format for best quality
- Limit to 3-5 companies for best visual appearance
- Use recognizable brands when possible

### Content Strategy

For effective banner content:

- Keep the title concise and action-oriented (5-7 words)
- Use a clear, compelling description (10-15 words)
- Include social proof with real company avatars
- Add a trust message to reduce friction
- Test different variations to optimize conversion

### Call to Action

For better conversion rates:

- Use clear, action-oriented button text
- Include pricing if applicable to set expectations
- Link to a secure payment page or pricing information
- Consider adding a money-back guarantee
- Ensure the destination page matches the promise

## Component Details

The post job banner component is implemented in `components/ui/post-job-banner.tsx`. The component:

- Uses Tailwind CSS for styling
- Adapts responsively to different screen sizes
- Maintains consistency with the rest of your site's design
- Handles image loading errors gracefully with fallback text

## Advanced Customization

If you need to customize the banner beyond what's available in the configuration:

1. Copy `components/ui/post-job-banner.tsx` to a custom components directory
2. Modify the component to match your exact requirements
3. Update imports in the job details sidebar to use your custom component

## Related Documentation

- [Configuration Guide](/docs/getting-started/configuration.md)
- [Pricing Page Configuration](/docs/guides/pricing.md)
- [Customization Guide](/docs/guides/customization.md) 