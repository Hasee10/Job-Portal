---
title: Gradient System
description: Learn how to create and customize gradient backgrounds in your Bordful job board.
lastUpdated: "2025-05-22"
---

# Gradient System

Bordful includes a powerful gradient system that allows you to create visually appealing backgrounds using both linear and radial gradients. This guide explains how to configure and customize gradients throughout your job board.

## Gradient Configuration

Gradients can be configured for various sections of your job board, with the hero section being the most common application. Gradient settings are defined in the `ui` section of your `config.ts` file.

### Basic Gradient Configuration

Here's a basic example of configuring a gradient for the hero section:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
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

### Gradient Types

Bordful supports two main types of gradients:

1. **Linear Gradients**: Colors transition along a straight line
2. **Radial Gradients**: Colors transition outward from a center point

## Linear Gradients

Linear gradients transition colors along a straight line. Configure them using:

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to right", // or "to left", "to bottom", "to top", etc.
  colors: ["#3b82f6", "#d946ef"], // At least 2 colors
}
```

### Linear Gradient Directions

The `direction` property accepts any valid CSS linear-gradient direction:

| Direction Value     | Description              | Visual Effect         |
| ------------------- | ------------------------ | --------------------- |
| `"to right"`        | Left to right            | Horizontal gradient → |
| `"to left"`         | Right to left            | Horizontal gradient ← |
| `"to bottom"`       | Top to bottom            | Vertical gradient ↓   |
| `"to top"`          | Bottom to top            | Vertical gradient ↑   |
| `"to bottom right"` | Top left to bottom right | Diagonal gradient ↘   |
| `"to top left"`     | Bottom right to top left | Diagonal gradient ↖   |
| `"45deg"`           | 45-degree angle          | Diagonal gradient ↗   |
| `"135deg"`          | 135-degree angle         | Diagonal gradient ↘   |
| `"225deg"`          | 225-degree angle         | Diagonal gradient ↙   |
| `"315deg"`          | 315-degree angle         | Diagonal gradient ↖   |

### Linear Gradient Examples

#### Horizontal Gradient (Left to Right)

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to right",
  colors: ["#3b82f6", "#d946ef"],
}
```

This creates a gradient that transitions from blue on the left to pink on the right.

#### Vertical Gradient (Top to Bottom)

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to bottom",
  colors: ["#f97316", "#db2777"],
}
```

This creates a gradient that transitions from orange at the top to pink at the bottom.

#### Diagonal Gradient

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "135deg",
  colors: ["#0ea5e9", "#8b5cf6", "#ec4899"],
}
```

This creates a diagonal gradient that transitions through three colors.

## Radial Gradients

Radial gradients transition colors outward from a center point. Configure them using:

```typescript
heroGradient: {
  enabled: true,
  type: "radial",
  direction: "circle", // or "ellipse", "circle at center", etc.
  colors: ["#3b82f6", "#d946ef"], // At least 2 colors
}
```

### Radial Gradient Shapes and Positions

The `direction` property accepts any valid CSS radial-gradient value:

| Direction Value        | Description                     | Visual Effect                    |
| ---------------------- | ------------------------------- | -------------------------------- |
| `"circle"`             | Circular gradient from center   | Even circular spread from center |
| `"ellipse"`            | Elliptical gradient from center | Oval-shaped spread from center   |
| `"circle at center"`   | Explicit circular center        | Same as "circle"                 |
| `"circle at top left"` | Circle from top left            | Circular spread from top left    |
| `"ellipse at top"`     | Ellipse from top center         | Oval spread from top center      |

### Radial Gradient Examples

#### Simple Circular Gradient

```typescript
heroGradient: {
  enabled: true,
  type: "radial",
  direction: "circle",
  colors: ["#34d399", "#10b981", "#059669"],
}
```

This creates a circular gradient that transitions from light green at the center to darker green at the edges.

#### Positioned Radial Gradient

```typescript
heroGradient: {
  enabled: true,
  type: "radial",
  direction: "circle at top right",
  colors: ["#60a5fa", "#3b82f6", "#1d4ed8"],
}
```

This creates a circular gradient that originates from the top right corner.

#### Elliptical Gradient

```typescript
heroGradient: {
  enabled: true,
  type: "radial",
  direction: "ellipse",
  colors: ["#a78bfa", "#8b5cf6", "#7c3aed"],
}
```

This creates an elliptical gradient that transitions from light purple at the center to darker purple at the edges.

## Color Stops

For more precise control over color positioning, use the optional `stops` array to specify where each color should appear in the gradient:

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

### Color Stop Examples

#### Uneven Distribution

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to right",
  colors: ["#f59e0b", "#d97706", "#92400e"],
  stops: ["0%", "30%", "100%"],
}
```

This creates a gradient where the middle color appears at the 30% mark rather than the 50% mark.

#### Multiple Stops with Emphasis

```typescript
heroGradient: {
  enabled: true,
  type: "linear",
  direction: "to bottom",
  colors: ["#06b6d4", "#0891b2", "#0e7490", "#155e75"],
  stops: ["0%", "20%", "30%", "100%"],
}
```

This creates a gradient with colors concentrated at the top portion.

## Advanced Usage

### Combining Gradients with Background Images

You can implement a fallback system where a gradient is used if a background image is not available:

```typescript
// config/config.ts
export const config = {
  // ... other configuration
  ui: {
    // Background image (highest precedence)
    heroBackgroundImage: {
      enabled: false, // Set to false to disable
      // ... image settings
    },
    
    // Gradient (used if background image is disabled)
    heroGradient: {
      enabled: true,
      type: "linear",
      direction: "to right",
      colors: ["#3b82f6", "#8b5cf6", "#d946ef"],
    },
    
    // Solid color (lowest precedence)
    heroBackgroundColor: "#1e40af",
  },
  // ... other configuration
};
```

The system follows a precedence order: background image > gradient > solid color. If the highest-priority option is disabled or fails, it falls back to the next option.

### Creating Custom Gradient Components

You can create reusable components that implement gradients for custom sections:

```tsx
// components/ui/gradient-section.tsx
import { config } from '@/config/config';

export function GradientSection({ children, gradientConfig }) {
  // Default to heroGradient if no specific config is provided
  const gradient = gradientConfig || config.ui.heroGradient;
  
  // Generate gradient CSS based on configuration
  const getGradientStyle = () => {
    if (!gradient.enabled) return {};
    
    const { type, direction, colors, stops } = gradient;
    
    // Build color stops string
    let colorStops = '';
    if (stops && stops.length === colors.length) {
      // If stops are provided, use them
      colorStops = colors.map((color, index) => `${color} ${stops[index]}`).join(', ');
    } else {
      // Otherwise, just use colors
      colorStops = colors.join(', ');
    }
    
    // Generate appropriate gradient
    const gradientValue = type === 'linear'
      ? `linear-gradient(${direction}, ${colorStops})`
      : `radial-gradient(${direction}, ${colorStops})`;
    
    return {
      background: gradientValue,
    };
  };
  
  return (
    <div 
      className="relative py-16"
      style={getGradientStyle()}
    >
      <div className="container mx-auto px-4">
        {children}
      </div>
    </div>
  );
}
```

## Implementation Details

The gradient system generates valid CSS gradient strings based on your configuration:

For linear gradients, it creates CSS like:
```css
background: linear-gradient(to right, #3b82f6 0%, #8b5cf6 50%, #d946ef 100%);
```

For radial gradients, it creates CSS like:
```css
background: radial-gradient(circle, #3b82f6 0%, #d946ef 100%);
```

The implementation intelligently handles color stops to ensure smooth transitions even if stops are not specified.

## Best Practices

1. **Color Harmony**: Choose colors that work well together for a pleasing visual effect
2. **Contrast**: Ensure sufficient contrast between the gradient and any text that appears over it
3. **Direction Purpose**: Choose gradient directions that support your design intention:
   - Horizontal gradients (left to right) suggest progression or journey
   - Vertical gradients (top to bottom) suggest hierarchy or depth
   - Radial gradients suggest focus or emphasis on a central point
4. **Subtlety**: For professional sites, consider subtle gradients with related colors rather than high-contrast combinations
5. **Testing**: Always test gradients across different screen sizes and brightness settings

## Related Documentation

- [Primary Color System](/docs/guides/colors.md)
- [Background Customization](/docs/guides/backgrounds.md)
- [Hero Section Customization](/docs/guides/hero-section.md) 