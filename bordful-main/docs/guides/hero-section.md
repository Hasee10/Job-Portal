---
title: Hero Section Customization
description: Learn how to fully customize the hero section of your Bordful job board, including background colors, gradients, images, and text styling.
lastUpdated: "2025-05-22"
---

> **Note:** Some of the gradient background configuration documented here overlaps with content in [`gradients.md`](/docs/guides/gradients.md). For comprehensive gradient system documentation, please refer to the dedicated [`gradients.md`](/docs/guides/gradients.md) file, while this document focuses specifically on hero section configuration and customization.

# Hero Section Customization

The hero section is the prominent banner at the top of your Bordful job board that displays the main title, subtitle, and search functionality. This guide explains how to customize its appearance.

## Overview

Bordful's hero section supports three main background styles:

- Solid background colors
- Gradient backgrounds (linear or radial)
- Background images with optional overlays

The system follows a precedence order: background image > gradient > solid color. If the highest-priority option is disabled or fails, it falls back to the next option.

## Configuration Options

All hero section customization is handled through the `ui` section in your `config/config.ts` file:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Solid background color (simplest option)
    heroBackgroundColor: "#005450",
    
    // Text styling
    heroTitleColor: "#ffffff",
    heroSubtitleColor: "#f3f4f6",
    
    // Badge styling
    heroBadgeVariant: "outline", // "default", "secondary", "outline", "destructive"
    heroBadgeBgColor: "#ffffff",
    heroBadgeTextColor: "#005450",
    heroBadgeBorderColor: "#ffffff",
    
    // Gradient background (takes precedence over solid color)
    heroGradient: {
      enabled: true,
      type: "linear",
      direction: "to right",
      colors: ["#005450", "#007a73", "#00a59c"],
      stops: ["0%", "50%", "100%"],
    },
    
    // Background image (highest precedence)
    heroBackgroundImage: {
      enabled: false,
      src: "/images/hero-background.jpg",
      position: "center",
      size: "cover",
      overlay: {
        enabled: true,
        color: "rgba(0, 0, 0, 0.5)",
      },
    },
  },
  // ... other configuration
};
```

## Background Style Options

### 1. Solid Background Color

The simplest option is to use a solid background color:

```typescript
ui: {
  heroBackgroundColor: "#005450", // Any valid CSS color value
  heroGradient: {
    enabled: false, // Make sure gradient is disabled
  },
  heroBackgroundImage: {
    enabled: false, // Make sure background image is disabled
  },
}
```

The `heroBackgroundColor` property accepts any valid CSS color value:
- Hexadecimal: `#005450`
- RGB: `rgb(0, 84, 80)`
- HSL: `hsl(177, 100%, 16%)`
- Named colors: `teal`

### 2. Gradient Background

For a more visually interesting background, you can use a gradient:

```typescript
ui: {
  heroGradient: {
    enabled: true, // Enable gradient background
    type: "linear", // "linear" or "radial"
    direction: "to right", // Direction for linear gradients
    colors: ["#3b82f6", "#8b5cf6", "#d946ef"], // Array of colors (2+ colors)
    stops: ["0%", "50%", "100%"], // Optional percentage stops
  },
  heroBackgroundImage: {
    enabled: false, // Make sure background image is disabled
  },
}
```

#### Linear Gradient Options

Linear gradients transition colors along a straight line. The `direction` property accepts any valid CSS linear-gradient direction:

- Cardinal directions: `"to right"`, `"to left"`, `"to top"`, `"to bottom"`
- Corners: `"to top right"`, `"to bottom left"`, etc.
- Angles: `"45deg"`, `"135deg"`, etc.

#### Radial Gradient Options

Radial gradients transition colors outward from a center point. The `direction` property accepts any valid CSS radial-gradient value:

- Shape: `"circle"`, `"ellipse"`
- Position: `"circle at center"`, `"ellipse at top left"`, etc.

#### Color Stops

The optional `stops` array lets you control where each color appears in the gradient. Each stop is a percentage value corresponding to a color in the `colors` array.

### 3. Background Image

For maximum visual impact, you can use a background image:

```typescript
ui: {
  heroBackgroundImage: {
    enabled: true, // Enable background image
    src: "/images/hero-background.jpg", // Path relative to the public directory
    position: "center", // CSS background-position value
    size: "cover", // CSS background-size value
    overlay: {
      enabled: true, // Enable overlay for better text readability
      color: "rgba(0, 0, 0, 0.5)", // Semi-transparent overlay
    },
  },
}
```

#### Background Image Options

- **src**: Path to the image file (relative to the `public` directory)
- **position**: CSS `background-position` value (default: `"center"`)
- **size**: CSS `background-size` value (default: `"cover"`)
- **overlay**: Optional semi-transparent layer for better text readability
  - **enabled**: Boolean to toggle the overlay on/off
  - **color**: Color value in rgba or hex format

## Text and Badge Styling

In addition to background customization, you can customize text colors and badge styling:

```typescript
ui: {
  // Text colors
  heroTitleColor: "#ffffff", // Main title color
  heroSubtitleColor: "#f3f4f6", // Subtitle/description color
  
  // Badge styling (the small badge above the title)
  heroBadgeVariant: "outline", // "default", "secondary", "outline", "destructive"
  heroBadgeBgColor: "#ffffff", // Badge background color
  heroBadgeTextColor: "#005450", // Badge text color
  heroBadgeBorderColor: "#ffffff", // Badge border color
}
```

## Examples

### Blue Gradient Example

```typescript
ui: {
  heroGradient: {
    enabled: true,
    type: "linear",
    direction: "to right",
    colors: ["#1d4ed8", "#3b82f6", "#60a5fa"],
  },
  heroTitleColor: "#ffffff",
  heroSubtitleColor: "#e0f2fe",
  heroBadgeVariant: "outline",
  heroBadgeBgColor: "transparent",
  heroBadgeTextColor: "#ffffff",
  heroBadgeBorderColor: "#ffffff",
}
```

### Diagonal Gradient Example

```typescript
ui: {
  heroGradient: {
    enabled: true,
    type: "linear",
    direction: "45deg", // Diagonal gradient
    colors: ["#3b82f6", "#8b5cf6", "#d946ef"],
  },
  heroTitleColor: "#ffffff",
  heroSubtitleColor: "#f5f3ff",
}
```

### Radial Gradient Example

```typescript
ui: {
  heroGradient: {
    enabled: true,
    type: "radial",
    direction: "circle", // Creates a circular gradient
    colors: ["#3b82f6", "#1e3a8a"],
  },
  heroTitleColor: "#ffffff",
  heroSubtitleColor: "#dbeafe",
}
```

### Background Image Example

```typescript
ui: {
  heroBackgroundImage: {
    enabled: true,
    src: "/images/office-space.jpg",
    position: "center",
    size: "cover",
    overlay: {
      enabled: true,
      color: "rgba(0, 0, 0, 0.6)", // Dark overlay for better text contrast
    },
  },
  heroTitleColor: "#ffffff",
  heroSubtitleColor: "#f9fafb",
}
```

## Best Practices

1. **Text Readability**: Ensure high contrast between text and background colors for readability.

2. **Responsive Testing**: Test your hero section on different devices to ensure it looks good at all screen sizes.

3. **Image Optimization**: If using background images, optimize them for web:
   - Use WebP format for better compression
   - Keep file size under 400KB for desktop images
   - Consider image dimensions (recommended: 2560×1440px for desktop)

4. **Fallback Styling**: Always set a `heroBackgroundColor` even when using gradients or images, as a fallback.

5. **Brand Consistency**: Use colors that align with your brand identity for a cohesive look.

## Implementation Details

The hero section is implemented in `components/ui/hero-section.tsx`, which uses the configuration to dynamically apply the appropriate styling:

- For solid backgrounds, it applies a simple background color
- For gradients, it generates CSS gradient strings
- For background images, it sets up the background image with optional overlay

## Related Documentation

- [Theming and Color Customization](/docs/guides/theming-customization.md)
- [Navigation Customization](/docs/guides/navigation.md)
- [Configuration Options](/docs/reference/configuration-options.md) 