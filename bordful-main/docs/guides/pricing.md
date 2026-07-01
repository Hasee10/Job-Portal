---
title: Pricing Page Customization
description: Configure and customize the pricing plans, payment options, and visual styling of your Bordful job board pricing page.
lastUpdated: "2025-05-22"
---

Bordful includes a fully customizable pricing page that allows you to showcase your job board's plans and payment options with a professional, visually appealing layout.

## Key Features

- Complete control over pricing plans and features
- Customizable plan highlighting and badges
- Payment method icons and processing information
- Flexible configuration for enabling/disabling the pricing page
- Consistent styling with the rest of your job board
- Mobile-responsive design that looks great on all devices

## Basic Configuration

The pricing page is configured through the `pricing` section in your `config/config.ts` file:

```typescript
pricing: {
  // Enable or disable the pricing page
  enabled: true,
  
  // Show pricing link in navigation
  showInNavigation: true,
  
  // Show pricing link in footer resources
  showInFooter: true,
  
  // Navigation label
  navigationLabel: "Pricing",
  
  // Badge text for hero section
  badge: "Pricing",
  
  // Page title and description
  title: "Simple, Transparent Pricing",
  description: "Choose the plan that's right for your job board needs.",
  
  // Currency for pricing display
  currency: "USD",
  
  // Payment processing information (displayed below pricing cards)
  paymentProcessingText: "Payments are processed & secured by Stripe. Price in USD. VAT may apply.",
  
  // Payment method icons to display
  paymentMethods: {
    enabled: true,
    icons: [
      { name: "visa", alt: "Visa" },
      { name: "mastercard", alt: "Mastercard" },
      { name: "amex", alt: "American Express" },
      { name: "applepay", alt: "Apple Pay" },
      { name: "googlepay", alt: "Google Pay" },
      { name: "paypal", alt: "PayPal" },
    ],
  },
  
  // Plans configuration
  plans: [
    // Plan configurations (see below)
  ],
}
```

### Enabling/Disabling the Pricing Page

You can completely enable or disable the pricing page with the `enabled` setting:

```typescript
pricing: {
  enabled: true, // Set to false to disable the pricing page
}
```

When disabled, any attempts to access the `/pricing` route will display a "Pricing Not Available" message with a link to return home.

### Navigation and Footer Integration

Control whether the pricing page appears in your navigation bar and footer:

```typescript
pricing: {
  showInNavigation: true, // Show in navigation bar
  showInFooter: true, // Show in footer resources
  navigationLabel: "Pricing", // Custom label for navigation links
}
```

### Page Title and Description

Customize the main heading and subheading on the pricing page:

```typescript
pricing: {
  title: "Simple, Transparent Pricing",
  description: "Choose the plan that's right for your job board needs.",
}
```

### Currency Configuration

Set the currency used for displaying prices:

```typescript
pricing: {
  currency: "USD", // Uses the same currency codes as job listings
}
```

The currency symbol is automatically derived from the currency code using the same currency system as job listings.

## Payment Information

### Processing Text

Add a customizable message about payment processing below the pricing cards:

```typescript
pricing: {
  paymentProcessingText: "Payments are processed & secured by Stripe. Price in USD. VAT may apply.",
}
```

### Payment Method Icons

Display recognized payment method icons with the `paymentMethods` configuration:

```typescript
pricing: {
  paymentMethods: {
    enabled: true, // Set to false to hide payment method icons
    icons: [
      { name: "visa", alt: "Visa" },
      { name: "mastercard", alt: "Mastercard" },
      { name: "amex", alt: "American Express" },
      { name: "applepay", alt: "Apple Pay" },
      { name: "googlepay", alt: "Google Pay" },
      { name: "paypal", alt: "PayPal" },
    ],
  },
}
```

The icons should be placed in the `/public/assets/` directory as SVG files named according to the `name` property (e.g., `visa.svg`, `mastercard.svg`, etc.).

## Pricing Plans

The heart of the pricing page is the `plans` array, which defines each pricing tier:

```typescript
plans: [
  {
    name: "Free",
    price: 0,
    billingTerm: "forever",
    description: "Perfect for getting started with basic hiring needs.",
    features: [
      "1 active job posting",
      "Basic job listing",
      "30-day visibility",
      "Standard support",
    ],
    cta: {
      label: "Get Started",
      link: "/post",
      variant: "outline", // Using button variants
    },
    badge: null, // No badge
    highlighted: false, // No highlighted border
  },
  {
    name: "Pro",
    price: 99,
    billingTerm: "job posting",
    description: "Great for occasional hiring needs with better visibility.",
    features: [
      "3 active job postings",
      "Standard job listings",
      "30-day visibility",
      "Email support",
    ],
    cta: {
      label: "Choose Pro",
      link: "https://stripe.com",
      variant: "outline",
    },
    badge: {
      text: "Popular",
      type: "featured", // Using badge types from JobBadge component
    },
    highlighted: true, // Highlighted with prominent border
  },
  {
    name: "Business",
    price: 999,
    billingTerm: "year",
    description: "Unlimited jobs postings for one year for serious recruiters.",
    features: [
      "5 active job postings",
      "Featured job listings",
      "30-day visibility",
      "Priority support",
    ],
    cta: {
      label: "Upgrade Now",
      link: "https://stripe.com",
      variant: "default",
    },
    badge: {
      text: "Best Value",
      type: "featured",
    },
    highlighted: false,
  },
],
```

### Plan Configuration Options

Each plan in the `plans` array can be customized with the following properties:

#### Basic Information

- `name`: The name of the plan (e.g., "Free", "Pro", "Business")
- `price`: The price of the plan (0 for free plans)
- `billingTerm`: A string describing the billing term (e.g., "forever", "job posting", "year", "month")
- `description`: A brief description of the plan

#### Features List

The `features` array allows you to list the benefits included in each plan:

```typescript
features: [
  "1 active job posting",
  "Basic job listing",
  "30-day visibility",
  "Standard support",
],
```

Each feature is displayed as a bullet point with a checkmark icon.

#### Call to Action Button

The `cta` object configures the action button for each plan:

```typescript
cta: {
  label: "Get Started", // Button text
  link: "/post", // URL the button links to (internal or external)
  variant: "outline", // Button style: "default" (solid) or "outline"
},
```

#### Plan Badges

You can add an optional badge to highlight special plans:

```typescript
badge: {
  text: "Popular", // Badge text
  type: "featured", // Badge style
},
```

Set `badge: null` to display no badge.

The `type` property accepts any of the badge types from the JobBadge component:
- `"featured"`: Dark background with light text (good for "Popular" or "Best Value")
- `"new"`: Green background (good for "New" or "Limited Time")
- `"default"`: Simple border with dark text (subtle option)

#### Plan Highlighting

To make a plan stand out with a more prominent border and subtle shadow:

```typescript
highlighted: true, // Set to false for standard styling
```

## Hero Section Customization

You can customize the hero section specifically for the pricing page:

```typescript
pricing: {
  // Hero image configuration (overrides global setting)
  heroImage: {
    enabled: false, // Disable hero image on the pricing page
    src: "", // Optional custom image path
    alt: "", // Optional custom alt text
  },
}
```

This allows you to have different hero styling on the pricing page compared to the rest of your site.

## SEO Configuration

Optimize your pricing page for search engines:

```typescript
pricing: {
  // SEO keywords
  keywords: "job board pricing, post job, job listing plans, recruitment pricing",
}
```

## Examples

### Basic Free and Paid Model

```typescript
plans: [
  {
    name: "Free",
    price: 0,
    billingTerm: "forever",
    description: "Post a single job listing for free.",
    features: [
      "1 active job posting",
      "30-day visibility",
      "Basic listing features",
    ],
    cta: {
      label: "Post for Free",
      link: "/post",
      variant: "outline",
    },
    badge: null,
    highlighted: false,
  },
  {
    name: "Premium",
    price: 99,
    billingTerm: "job posting",
    description: "Enhanced visibility for your job listing.",
    features: [
      "Featured placement",
      "60-day visibility",
      "Social media promotion",
      "Email support",
    ],
    cta: {
      label: "Choose Premium",
      link: "/checkout/premium",
      variant: "default",
    },
    badge: {
      text: "Recommended",
      type: "featured",
    },
    highlighted: true,
  },
]
```

### Subscription-Based Model

```typescript
plans: [
  {
    name: "Monthly",
    price: 49,
    billingTerm: "month",
    description: "Perfect for occasional hiring needs.",
    features: [
      "Up to 3 active job postings",
      "Featured placement",
      "30-day visibility per job",
      "Standard support",
    ],
    cta: {
      label: "Subscribe Monthly",
      link: "/subscribe/monthly",
      variant: "outline",
    },
    badge: null,
    highlighted: false,
  },
  {
    name: "Annual",
    price: 499,
    billingTerm: "year",
    description: "Best value for regular hiring.",
    features: [
      "Up to 10 active job postings",
      "Featured placement",
      "60-day visibility per job",
      "Priority support",
      "Company profile page",
    ],
    cta: {
      label: "Subscribe Annually",
      link: "/subscribe/annual",
      variant: "default",
    },
    badge: {
      text: "Save 15%",
      type: "new",
    },
    highlighted: true,
  },
]
```

## Best Practices

1. **Clear Value Proposition**: Make the benefits of each plan immediately obvious
2. **Logical Progression**: Arrange plans from lowest to highest price
3. **Highlight Best Value**: Use the `highlighted` property and badges to guide users toward preferred plans
4. **Consistent Terminology**: Use the same terms across your site for features and benefits
5. **Action-Oriented Labels**: Use clear, action-oriented text for CTA buttons
6. **Mobile Testing**: Test how the pricing cards display on mobile devices

## Implementation Details

The pricing page is implemented in `app/pricing/page.tsx`, which reads the configuration from `config/config.ts` and renders the appropriate layout and content.

## Related Documentation

- [Navigation Customization](/docs/guides/navigation.md)
- [Footer Customization](/docs/guides/footer.md)
- [Currencies](/docs/reference/currencies.md)
- [Configuration Options](/docs/reference/configuration-options.md) 