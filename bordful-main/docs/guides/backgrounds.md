---
title: Background Customization
description: Learn how to customize background colors and images across different sections of your Bordful job board.
lastUpdated: "2025-05-22"
---

# Background Customization

This guide explains how to customize background colors and images throughout your Bordful job board to match your brand identity and create visually appealing designs.

## Background Color Configuration

Bordful allows you to customize background colors for various sections of your job board. These settings are configured in the `ui` section of your `config.ts` file.

### Main Background Colors

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Main background colors
    backgroundColor: "#ffffff", // Main background color
    secondaryBackgroundColor: "#f9fafb", // Secondary/alternate background
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

These settings control:
- `backgroundColor`: The main background color used throughout the site
- `secondaryBackgroundColor`: Used for alternating sections, cards, and other elements

### Section-Specific Background Colors

You can also customize the background color of specific sections:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Section-specific backgrounds
    heroBackgroundColor: "#f8fafc", // Hero section background
    footerBackgroundColor: "#111827", // Footer background
    cardBackgroundColor: "#ffffff", // Job card background
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

Each of these properties accepts any valid CSS color value:
- Hexadecimal: `#f8fafc`
- RGB: `rgb(248, 250, 252)`
- HSL: `hsl(210, 40%, 98%)`
- Named colors: `white`

## Background Image Customization

For more visual impact, Bordful supports background images in key sections of the job board. The most common use is in the hero section, but the pattern can be applied to other sections as needed.

### Hero Background Image

To set up a background image for the hero section:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Hero background image
    heroBackgroundImage: {
      enabled: true, // Set to true to enable background image
      src: "/images/hero-background.jpg", // Path to image from public directory
      position: "center", // CSS background-position value
      size: "cover", // CSS background-size value
      // Optional overlay for better text readability
      overlay: {
        enabled: true, // Set to true to enable a color overlay
        color: "rgba(0, 0, 0, 0.5)", // Semi-transparent color
        opacity: 0.5, // Opacity from 0 to 1
      },
    },
    
    // ... other UI configuration
  },
  // ... other configuration
};
```

#### Configuration Options

- **enabled**: Boolean to toggle the background image on/off
- **src**: Path to the image file (relative to the `public` directory)
- **position**: CSS `background-position` value (default: `"center"`)
- **size**: CSS `background-size` value (default: `"cover"`)
- **overlay**: Optional semi-transparent layer for better text readability
  - **enabled**: Boolean to toggle the overlay on/off
  - **color**: Color value in rgba or hex format
  - **opacity**: Number between 0 and 1 (alternative to using rgba)

### Optimal Image Sizes

For crisp images on high-resolution displays, including Retina screens, follow these guidelines:

| Screen Size | Recommended Dimensions | Format | Max File Size |
| ----------- | ---------------------- | ------ | ------------- |
| Desktop     | 2560px × 1440px        | WebP   | 400KB         |
| Tablet      | 1536px × 1024px        | WebP   | 250KB         |
| Mobile      | 828px × 1792px         | WebP   | 150KB         |

- **Resolution**: Aim for 180-220 PPI for optimal quality
- **Format**: Use WebP for best compression-to-quality ratio, with JPEG fallback
- **Aspect Ratio**: 16:9 or 3:2 typically works well for hero sections

## Applying Background Images to Custom Sections

While the hero section is the primary area for background images, you can apply similar techniques to other sections by creating custom components. Here's an example of how to implement a background image in a custom section:

```tsx
// components/ui/custom-section.tsx
import Image from 'next/image';
import { config } from '@/config/config';

export function CustomSection({ children }) {
  const { customSectionBg } = config.ui;
  
  return (
    <div 
      className="relative py-16"
      style={{
        backgroundImage: customSectionBg.enabled ? `url(${customSectionBg.src})` : 'none',
        backgroundPosition: customSectionBg.position || 'center',
        backgroundSize: customSectionBg.size || 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay */}
      {customSectionBg.enabled && customSectionBg.overlay?.enabled && (
        <div 
          className="absolute inset-0" 
          style={{
            backgroundColor: customSectionBg.overlay.color || 'rgba(0,0,0,0.5)',
            opacity: customSectionBg.overlay.opacity,
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4">
        {children}
      </div>
    </div>
  );
}
```

## Performance Considerations

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
   - For sections below the fold, consider lazy loading the background image

## Examples

### Simple Background Image

```typescript
heroBackgroundImage: {
  enabled: true,
  src: "/images/hero-background.jpg",
  position: "center",
  size: "cover",
}
```

### Background Image with Dark Overlay

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

### Background Image with Brand Color Overlay

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

### Background Image with Custom Position

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

## Best Practices

1. **Ensure text readability**: Always maintain sufficient contrast between text and backgrounds
2. **Test across devices**: Check how background images appear on different screen sizes
3. **Provide fallbacks**: Always set a background color as a fallback for images
4. **Consider loading time**: Optimize images for web to maintain fast page loads
5. **Maintain brand consistency**: Choose images that align with your brand identity

## Related Documentation

- [Primary Color System](/docs/guides/colors.md)
- [Gradient System](/docs/guides/gradients.md)
- [Hero Section Customization](/docs/guides/hero-section.md) 