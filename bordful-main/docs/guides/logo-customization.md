---
title: Logo Customization
description: Learn how to customize the logo and branding across your Bordful job board.
lastUpdated: "2025-05-22"
---

# Logo Customization

Bordful allows you to customize the logo displayed in the navigation bar, footer, and other branding locations throughout your job board. This guide explains how to configure and optimize your logo for the best appearance.

## Logo Configuration

The main logo configuration is handled in the `nav` section of your `config/config.ts` file, which controls how your logo appears in the navigation bar:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  nav: {
    title: "JobBoard", // Text displayed next to icon or when no logo is used
    logo: {
      enabled: true, // Set to true to use a custom logo instead of icon + text
      src: "/your-logo.svg", // Path to your logo image (place it in the public directory)
      width: 120, // Width of the logo in pixels
      height: 32, // Height of the logo in pixels
      alt: "Your Company Logo", // Alt text for the logo (important for accessibility)
      linkToHome: true, // Whether clicking the logo navigates to the homepage
    },
    // ... other navigation configuration
  },
  // ... other configuration
};
```

## Logo Display Modes

Bordful supports two primary display modes for your brand in the navigation:

### 1. Icon + Text Mode (Default)

If you don't have a custom logo or prefer a simpler approach, you can use the default icon + text mode:

```typescript
nav: {
  title: "Your Job Board", // This text appears next to the icon
  logo: {
    enabled: false, // Keep this false for icon + text mode
  },
}
```

In this mode, Bordful displays its default icon followed by your site title text.

### 2. Custom Logo Mode

For a fully branded experience, enable the custom logo option:

```typescript
nav: {
  logo: {
    enabled: true, // Enable custom logo
    src: "/your-logo.svg", // Path to your logo (in public directory)
    width: 120, // Width in pixels
    height: 32, // Height in pixels
    alt: "Your Company Logo", // Alt text for accessibility
  },
}
```

## Logo Placement

Your logo appears in several locations throughout the job board:

1. **Navigation Bar**: The primary placement at the top left of every page
2. **Footer**: Optionally displayed in the footer's brand section
3. **Favicon**: Used as the browser tab icon (configured separately)
4. **OpenGraph Images**: Can be included in social sharing images

### Footer Logo Configuration

The footer can optionally display your logo as well. This is controlled in the footer section:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  footer: {
    brand: {
      name: "Your Company", // Company name in footer
      description: "Brief description of your company or job board", // Short tagline
      showLogo: true, // Whether to show the logo in footer
    },
    // ... other footer configuration
  },
  // ... other configuration
};
```

When `showLogo` is set to `true`, the footer will display the same logo as configured in the navigation section.

## Logo File Recommendations

### File Formats

For the best results across all devices and browsers:

| Format | Use Case                        | Benefits                                                     |
| ------ | ------------------------------- | ------------------------------------------------------------ |
| SVG    | Preferred for most logos        | Scales perfectly, smallest file size, transparent background |
| PNG    | Complex logos with transparency | Good for logos with complex details, supports transparency   |
| WebP   | Modern alternative to PNG       | Better compression, good for photos within logos             |

### Dimensions and Sizing

For optimal display on high-DPI/Retina displays:

| Placement  | Recommended Size            | Max Height  |
| ---------- | --------------------------- | ----------- |
| Navigation | 120-180px width             | 36px height |
| Footer     | 90-150px width              | 40px height |
| Favicon    | 32x32px, 64x64px, 180x180px | -           |
| OpenGraph  | 1200x630px                  | -           |

### Responsive Considerations

The logo automatically scales on different screen sizes:

- On mobile devices, the navigation bar height decreases
- Ensure your logo works well when scaled down
- Consider creating a "compact" version for very small screens

## Favicon Configuration

To set a custom favicon:

1. Prepare icons in multiple sizes (16x16, 32x32, 180x180)
2. Place them in your public directory
3. Add the appropriate links in your `app/layout.tsx` file:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Dark Mode Considerations

If your site supports dark mode, consider these approaches for logos:

1. **Separate Dark/Light Logos**: 
   ```typescript
   nav: {
     logo: {
       enabled: true,
       src: "/logo.svg", // Regular logo
       darkModeSrc: "/logo-dark.svg", // Dark mode logo
       // ... other logo configuration
     },
   }
   ```

2. **Adaptive SVG Logo**:
   Create an SVG that uses `currentColor` for key elements so it adapts to theme changes

## Logo Best Practices

1. **Keep it Simple**: Simpler logos render better at small sizes
2. **Ensure Readability**: Text in logos should be legible even when small
3. **Provide Proper Alt Text**: Always include descriptive alt text for accessibility
4. **Test Across Devices**: Verify how your logo looks on mobile, tablet, and desktop
5. **Optimize File Size**: Compress images to ensure fast loading
6. **Use Transparent Backgrounds**: For seamless integration with different background colors
7. **Consider a Logo System**: Use a mark-only version for very small displays

## Implementation Example

Here's a complete example of logo configuration:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  nav: {
    title: "Acme Jobs", // Fallback text if logo is disabled
    logo: {
      enabled: true,
      src: "/images/acme-logo.svg",
      width: 140,
      height: 32,
      alt: "Acme Corporation Jobs",
    },
    // ... other navigation configuration
  },
  footer: {
    brand: {
      name: "Acme Corporation",
      description: "Helping job seekers find their dream roles since 2010.",
      showLogo: true,
    },
    // ... other footer configuration
  },
  // ... other configuration
};
```

## Advanced: Custom Logo Component

If you need more control over how your logo renders, you can modify the logo component in your codebase:

```tsx
// components/ui/logo.tsx
import Image from 'next/image';
import Link from 'next/link';
import { config } from '@/config/config';

export function Logo() {
  const { logo, title } = config.nav;
  
  if (!logo.enabled) {
    return (
      <Link href="/" className="flex items-center space-x-2">
        <IconComponent /> {/* Your default icon */}
        <span className="font-semibold">{title}</span>
      </Link>
    );
  }
  
  return (
    <Link href="/" aria-label={logo.alt || title}>
      <Image
        src={logo.src}
        width={logo.width || 120}
        height={logo.height || 32}
        alt={logo.alt || title}
        priority
      />
    </Link>
  );
}
```

## Related Documentation

- [Navigation Customization](/docs/guides/navigation.md)
- [Footer Customization](/docs/guides/footer.md)
- [Primary Color System](/docs/guides/colors.md)
- [Theming and Color Customization](/docs/guides/theming-customization.md) 