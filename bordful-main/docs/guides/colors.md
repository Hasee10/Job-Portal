---
title: Primary Color System
description: Learn how to customize the primary color used throughout your Bordful job board.
lastUpdated: "2025-05-22"
---

# Primary Color System

Bordful features a configurable primary color system that allows you to customize the color theme used consistently across various UI elements throughout your job board.

## Primary Color Configuration

The job board supports a configurable primary color that is consistently applied across various UI elements throughout the site. This allows for easy branding customization without having to modify individual components.

### Configuration

To set your primary color, update the `primaryColor` property in the `ui` section of your `config.ts` file:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Primary color used throughout the site (buttons, links, etc.)
    // Can be hex, rgb, hsl, etc.
    primaryColor: "#4f46e5", // Example: indigo color
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

The `primaryColor` value can be any of the following:

1. **Standard CSS color values:**
   - Hexadecimal: `#4f46e5`
   - RGB: `rgb(79, 70, 229)`
   - HSL: `hsl(245, 75%, 59%)`

2. **Tailwind color patterns:**
   - Format: `{color}-{shade}` (e.g., `slate-500`)
   - Examples:
     - `indigo-600` (Tailwind's indigo-600 color)
     - `blue-700` (Tailwind's blue-700 color)
     - `emerald-500` (Tailwind's emerald-500 color)

Supported Tailwind colors include: slate, gray, zinc, red, orange, amber, yellow, green, emerald, teal, cyan, blue, indigo, purple, and pink, with shades from 50 to 950.

### Components Using Primary Color

The primary color is automatically applied to the following components:

1. **Navigation Bar**
   - "Post a Job" button in the top navigation

2. **Job Cards**
   - Featured badges on job listings
   - "Apply Now" buttons (visible on hover)

3. **Job Detail Pages**
   - "Apply Now" buttons (top and bottom of job details)

4. **Footer**
   - "Post a Job" button in the footer

5. **Post Job Banner**
   - Call-to-action button in the "Hiring? Post Your Job Ad Here" banner

### Implementation Details

The primary color is applied using a color resolver that handles both direct CSS colors and Tailwind color patterns. This provides flexibility while maintaining a clean configuration.

The implementation:
1. Automatically detects if you're using CSS colors (`#hex`, `rgb()`, etc.) or Tailwind patterns (`blue-500`)
2. Resolves Tailwind patterns to their corresponding hex values
3. Applies the color consistently across all components

## Text Colors

In addition to the primary color, you can customize text colors for various elements:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Text colors
    titleColor: "#111827", // Main titles (h1, h2)
    textColor: "#374151", // Regular text
    mutedTextColor: "#6b7280", // Secondary/muted text
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

These text colors are used consistently throughout the application to maintain a cohesive design.

## Button Colors

Buttons throughout the application can be customized using the following properties:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Button colors
    buttonTextColor: "#ffffff", // Text color for primary buttons
    buttonHoverColor: "#4338ca", // Hover color for primary buttons
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

## Best Practices

When customizing colors, consider the following best practices:

1. **Accessibility**: Ensure sufficient contrast between text and background colors. Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify.

2. **Consistency**: Use the primary color for key actions and important elements consistently throughout the site.

3. **Brand Alignment**: Choose colors that align with your brand identity for a cohesive look.

4. **Color Psychology**: Consider the psychological impact of your color choices. Different colors evoke different emotions and reactions.

## Examples

### Blue Theme

```typescript
ui: {
  primaryColor: "blue-600", // Using Tailwind's blue-600
  titleColor: "#1e3a8a", // Dark blue for titles
  textColor: "#334155", // Slate-700 for text
  mutedTextColor: "#64748b", // Slate-500 for muted text
}
```

### Green Theme

```typescript
ui: {
  primaryColor: "#10b981", // Emerald-500
  titleColor: "#064e3b", // Emerald-900 for titles
  textColor: "#1f2937", // Gray-800 for text
  mutedTextColor: "#6b7280", // Gray-500 for muted text
}
```

### High Contrast Theme

```typescript
ui: {
  primaryColor: "#000000", // Black
  titleColor: "#000000", // Black for titles
  textColor: "#000000", // Black for text
  mutedTextColor: "#4b5563", // Gray-600 for muted text
  buttonTextColor: "#ffffff", // White for button text
}
```

## Related Documentation

- [Logo Customization](/docs/guides/logo-customization.md)
- [Background Customization](/docs/guides/backgrounds.md)
- [Gradient System](/docs/guides/gradients.md)
- [Hero Section Customization](/docs/guides/hero-section.md) 