---
title: Theming and Color Customization
description: Learn how to customize the visual appearance of your Bordful job board by configuring colors and other theming options.
lastUpdated: "2025-05-22"
---

> **Note:** This documentation file has been split into multiple smaller, more focused files for better organization:
> - [`colors.md`](/docs/guides/colors.md) - Primary color system and theming
> - [`backgrounds.md`](/docs/guides/backgrounds.md) - Background customization
> - [`gradients.md`](/docs/guides/gradients.md) - Gradient system and configuration
>
> Please use the links above to access the updated documentation. The content below is maintained for backward compatibility.

# Theming and Color Customization

This document explains how to customize the visual appearance of your job board by configuring colors and other theming options.

## Primary Color Configuration

The job board now supports a configurable primary color that is consistently applied across various UI elements throughout the site. This allows for easy branding customization without having to modify individual components.

### Configuration

To set your primary color, update the `primaryColor` property in the `ui` section of your `config.ts` file:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Hero section background color
    heroBackgroundColor: "#f8fafc",
    
    // Primary color used throughout the site (buttons, links, etc.)
    // Can be hex, rgb, hsl, etc.
    primaryColor: "#4f46e5", // Example: indigo color
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

The implementation intelligently handles color stops to ensure smooth transitions even if stops are not specified.

## Background Customization

In addition to the primary color, you can customize the background color of specific sections:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Hero section background color
    heroBackgroundColor: "#f8fafc", // Or use "slate-50" as a Tailwind color
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

## Hero Gradient Backgrounds

The hero section now supports both solid color backgrounds and gradient backgrounds for enhanced visual appeal. Gradients can be configured using the `heroGradient` property in the `ui` section of your configuration file.

### Basic Configuration

To set up a gradient background:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Hero section solid background color (used as fallback)
    heroBackgroundColor: "#005450",
    
    // Hero section gradient background
    heroGradient: {
      enabled: true, // Set to true to enable gradient background
      type: "linear", // "linear" or "radial"
      direction: "to right", // Direction for linear or style for radial
      colors: [
        "#005450", // Start color
        "#007a73", // Optional middle color(s)
        "#00a59c", // End color
      ],
      // Optional stops for precise color position control
      stops: ["0%", "50%", "100%"],
    },
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

### Gradient Types and Options

#### Linear Gradients

Linear gradients transition colors along a straight line. Configure them using:

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to right", // or "to left", "to bottom", "to top", etc.
  colors: ["#3b82f6", "#d946ef"], // At least 2 colors
}
```

The `direction` property accepts any valid CSS linear-gradient direction:
- Cardinal directions: `"to right"`, `"to left"`, `"to top"`, `"to bottom"`
- Corners: `"to top right"`, `"to bottom left"`, etc.
- Angles: `"45deg"`, `"135deg"`, etc.

#### Radial Gradients

Radial gradients transition colors outward from a center point. Configure them using:

```typescript
heroGradient: {
  enabled: true,
  type: "radial",
  direction: "circle", // or "ellipse", "circle at center", etc.
  colors: ["#3b82f6", "#d946ef"], // At least 2 colors
}
```

The `direction` property accepts any valid CSS radial-gradient value:
- Shape: `"circle"`, `"ellipse"`
- Position: `"circle at center"`, `"ellipse at top left"`, etc.

### Color Stops

For more precise control over color positioning, you can use the optional `stops` array to specify where each color should appear in the gradient:

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to right",
  colors: ["#3b82f6", "#8b5cf6", "#d946ef"],
  stops: ["0%", "30%", "100%"], // Position each color
}
```

The `stops` array should have the same length as the `colors` array. Each stop is a percentage value that determines where the corresponding color appears in the gradient.

### Disabling Gradients

To revert to a solid background color, simply set `enabled` to `false`:

```typescript
heroGradient: {
  enabled: false,
}
```

When gradients are disabled, the system falls back to using the `heroBackgroundColor` property.

### Examples

#### Blue-to-Purple Horizontal Gradient

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to right",
  colors: ["#1d4ed8", "#7e22ce"],
}
```

#### Three-Color Diagonal Gradient

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "135deg",
  colors: ["#0ea5e9", "#8b5cf6", "#ec4899"],
  stops: ["0%", "50%", "100%"],
}
```

#### Radial Gradient

```typescript
heroGradient: {
  enabled: true,
  type: "radial",
  direction: "circle at center",
  colors: ["#34d399", "#10b981", "#059669"],
}
```

#### Sunset Gradient

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to bottom",
  colors: ["#f97316", "#db2777"],
}
```

### Technical Implementation

The hero gradient system generates valid CSS gradient strings based on your configuration. For linear gradients, it creates CSS like:

```css
background: linear-gradient(to right, #3b82f6 0%, #8b5cf6 50%, #d946ef 100%);
```

For radial gradients, it creates CSS like:

```css
background: radial-gradient(circle, #3b82f6 0%, #d946ef 100%);
```

The implementation intelligently handles color stops to ensure smooth transitions even if stops are not specified.

## Hero Background Images

The hero section now also supports background images for even more visual customization options. Background images take precedence over both gradients and solid background colors when enabled.

### Basic Configuration

To set up a background image:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Hero background image (highest precedence)
    heroBackgroundImage: {
      enabled: true, // Set to true to enable background image
      src: "/hero-background.jpg", // Path to image from public directory
      position: "center", // CSS background-position value
      size: "cover", // CSS background-size value
      // Optional overlay for better text readability
      overlay: {
        enabled: true, // Set to true to enable a color overlay
        color: "rgba(0, 84, 80, 0.7)", // Semi-transparent color
        opacity: 0.7, // Opacity from 0 to 1
      },
    },
    
    // Fallback options if image is disabled or fails to load
    heroGradient: {
      enabled: false,
      // gradient options...
    },
    heroBackgroundColor: "#005450",
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

### Configuration Options

#### Basic Image Settings

- **enabled**: Boolean to toggle the background image on/off
- **src**: Path to the image file (relative to the `public` directory)
- **position**: CSS `background-position` value (default: `"center"`)
- **size**: CSS `background-size` value (default: `"cover"`)

#### Overlay Settings

The overlay is a semi-transparent color layer that sits on top of the background image to improve text readability:

- **overlay.enabled**: Boolean to toggle the overlay on/off
- **overlay.color**: Color value in rgba or hex format
- **overlay.opacity**: Number between 0 and 1 (alternative to using rgba)

### Optimal Image Sizes

For crisp images on high-resolution displays, including Retina screens, follow these guidelines:

| Screen Size | Recommended Image Dimensions | Format | Max File Size |
| ----------- | ---------------------------- | ------ | ------------- |
| Desktop     | 2560px × 1440px              | WebP   | 400KB         |
| Tablet      | 1536px × 1024px              | WebP   | 250KB         |
| Mobile      | 828px × 1792px               | WebP   | 150KB         |

- **Resolution**: Aim for 180-220 PPI for optimal quality
- **Format**: Use WebP for best compression-to-quality ratio, with JPEG fallback
- **Aspect Ratio**: 16:9 or 3:2 typically works well for hero sections

### Examples

#### Simple Background Image

```typescript
heroBackgroundImage: {
  enabled: true,
  src: "/images/hero-background.jpg",
  position: "center",
  size: "cover",
}
```

#### Background Image with Dark Overlay

```typescript
heroBackgroundImage: {
  enabled: true,
  src: "/images/office-space.jpg",
  position: "center",
  size: "cover",
  overlay: {
    enabled: true,
    color: "rgba(0, 0, 0, 0.6)", // Dark overlay for better text contrast
  },
}
```

#### Background Image with Brand Color Overlay

```typescript
heroBackgroundImage: {
  enabled: true,
  src: "/images/team-collaboration.jpg",
  position: "top center",
  size: "cover",
  overlay: {
    enabled: true,
    color: "rgba(79, 70, 229, 0.7)", // Brand color (indigo) overlay
  },
}
```

#### Background Image with Custom Position

```typescript
heroBackgroundImage: {
  enabled: true,
  src: "/images/cityscape.jpg",
  position: "bottom center", // Shows the bottom part of the image
  size: "cover",
  overlay: {
    enabled: true,
    color: "rgba(0, 0, 0, 0.4)",
  },
}
```

### Performance Considerations

Background images can affect page load performance. Follow these best practices:

1. **Optimize your images**:
   - Use tools like ImageOptim, TinyPNG, or Squoosh to compress images
   - Consider using Next.js Image Optimization API for dynamically served optimized images

2. **Use appropriate dimensions**:
   - Don't use an 8K image for a small hero section
   - Balance quality and file size

3. **Consider responsive images**:
   - Use different sized images for different device sizes
   - Implement with media queries or Next.js responsive image features

4. **Lazy loading**:
   - For hero sections below the fold, consider lazy loading the background image

### Technical Implementation

The hero background image is implemented using CSS `background-image` with optional overlay:

```css
/* Base background image */
.hero {
  background-image: url('/path/to/image.jpg');
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  position: relative;
}

/* Overlay implementation */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

/* Content sits above the overlay */
.hero-content {
  position: relative;
  z-index: 2;
}
```

In the actual implementation, these styles are applied inline via the React component style props.

## Best Practices

When customizing colors, consider the following best practices:

1. **Accessibility**: Ensure sufficient contrast between text and background colors. Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify.

2. **Consistency**: Use the primary color for key actions and important elements consistently throughout the site.

3. **Brand Alignment**: Choose colors that align with your brand identity for a cohesive look.

4. **Color Psychology**: Consider the psychological impact of your color choices. Different colors evoke different emotions and reactions.

## Related Documentation

- [Navigation Customization](/docs/guides/navigation.md)
- [Hero Section Customization](/docs/guides/hero-section.md)
- [Footer Customization](/docs/guides/footer.md)
- [Customization Guide](/docs/guides/customization.md) 