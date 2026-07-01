---
title: Job Alerts Configuration Guide
description: Learn how to set up, configure, and customize the job alerts subscription feature in your Bordful job board.
lastUpdated: "2025-05-22"
---

# Job Alerts Configuration Guide

The job alerts feature allows users to subscribe to email notifications for new job postings, increasing user engagement and driving return visits to your job board. This guide covers all aspects of setting up and customizing job alerts in your Bordful installation.

## Overview

Job alerts work by:

1. Providing a dedicated page where users can subscribe to job notifications
2. Capturing user information through a customizable form
3. Sending the data to your configured email provider
4. Allowing your email provider to send automated notifications about new jobs

The job alerts system is fully integrated with Bordful's email provider system, making it easy to connect to services like Encharge, Mailchimp, and others.

## Basic Setup

### Step 1: Enable Job Alerts

In your `config/config.ts` file, enable the job alerts feature:

```typescript
jobAlerts: {
  // Enable or disable the job alerts feature
  enabled: true,
  
  // The email provider to use (must match a provider in the email section)
  provider: "encharge",
},
```

### Step 2: Configure an Email Provider

Job alerts require an email provider to store subscriber information and send notifications. Configure your provider in the `email` section of your config file:

```typescript
email: {
  // The email provider to use for subscriptions
  provider: process.env.EMAIL_PROVIDER || "encharge",

  // Encharge configuration
  encharge: {
    // Your Encharge write key (from Encharge dashboard)
    writeKey: process.env.ENCHARGE_WRITE_KEY,

    // Default tags to apply to subscribers
    defaultTags: "job-alerts-subscriber",

    // Event name for subscriptions
    eventName: "Job Alert Subscription",
  },
},
```

For detailed instructions on setting up email providers, see the [Email Provider Integration](/docs/guides/email-integration.md) guide.

### Step 3: Customize Navigation Links

Control whether job alerts appear in your navigation and footer:

```typescript
jobAlerts: {
  // Enable or disable the job alerts feature
  enabled: true,

  // Show job alerts link in navigation
  showInNavigation: true,

  // Show job alerts link in footer resources
  showInFooter: true,

  // Navigation label
  navigationLabel: "Job Alerts",
  
  // ... other settings
},
```

## Complete Configuration Options

Below is the complete set of configuration options for job alerts, with explanations for each setting:

```typescript
// Job Alerts Configuration
jobAlerts: {
  // Enable or disable the job alerts feature
  enabled: true,

  // Show job alerts link in navigation
  showInNavigation: true,

  // Show job alerts link in footer resources
  showInFooter: true,

  // Navigation label
  navigationLabel: "Job Alerts",
  
  // Hero section configuration
  hero: {
    // Badge text in hero section
    badge: "Job Alerts",
    
    // Main title in hero section
    title: "Get Jobs Right to Your Inbox",
    
    // Description text in hero section
    description: "Subscribe to job alerts and get notified when new opportunities are posted."
  },
  
  // Hero image configuration (overrides global setting)
  heroImage: {
    enabled: false, // Disable hero image on the job alerts page
    src: "", // Optional custom image path
    alt: "", // Optional custom alt text
  },
  
  // Form text configuration
  form: {
    // Heading text for the form section
    heading: "Subscribe for Updates",
    
    // Description text under the heading
    description: "Get notified when new jobs are posted. We'll also subscribe you to Bordful newsletter.",
    
    // Form fields configuration
    fields: {
      // Name field labels and errors
      name: {
        label: "Name *",
        placeholder: "Your name",
        required: "Name is required"
      },
      // Email field labels and errors
      email: {
        label: "Email *",
        placeholder: "your@email.com",
        required: "Email is required",
        invalid: "Please enter a valid email address"
      }
    },
    
    // Button text for the subscribe form
    buttonText: "Subscribe to Job Alerts",
    
    // Loading text when form is being submitted
    loadingText: "Subscribing...",
    
    // Success message heading after successful subscription
    successHeading: "Subscription Confirmed!",
    
    // Success message description after successful subscription
    successDescription: "Thank you for subscribing to job alerts. You'll receive emails when jobs matching your interests are posted.",
    
    // Text for the button to subscribe with another email after success
    resetButtonText: "Subscribe with another email",
    
    // Toast notification messages
    toast: {
      success: {
        title: "Subscription successful!",
        description: "You'll now receive job alerts in your inbox."
      },
      rateLimit: {
        title: "Rate limit exceeded",
        description: "Too many requests. Please try again later."
      },
      error: {
        title: "Something went wrong",
        description: "Failed to subscribe to job alerts. Please try again."
      }
    }
  },

  // The email provider to use (must match a provider in the email section)
  provider: "encharge",
},
```

## Customizing the Hero Section

The job alerts page includes a hero section that you can fully customize to match your branding and messaging. This section appears at the top of the page and helps explain the value of subscribing to job alerts.

### Text Customization

```typescript
hero: {
  // Badge text in hero section
  badge: "Never Miss an Opportunity",
  
  // Main title in hero section
  title: "Stay Updated on New Job Postings",
  
  // Description text in hero section
  description: "Get personalized job alerts delivered directly to your inbox. Be the first to know when new positions matching your interests are available."
},
```

### Hero Image

You can enable or disable the hero image specifically for the job alerts page, overriding the global hero image settings:

```typescript
heroImage: {
  enabled: true, // Enable a hero image on the job alerts page
  src: "/images/job-alerts-hero.jpg", // Custom image path
  alt: "Person receiving job notification on mobile phone", // Descriptive alt text
},
```

If you don't specify a custom image, the page will use the global hero image configuration if enabled.

## Customizing the Subscription Form

The subscription form is the core component of the job alerts feature. You can customize all text elements, field labels, and messages:

### Form Text

```typescript
form: {
  heading: "Stay Ahead of the Competition",
  description: "Subscribe to our job alerts and be the first to know about new opportunities in your field.",
  // ... other settings
},
```

### Form Fields

```typescript
fields: {
  name: {
    label: "Full Name",
    placeholder: "Enter your full name",
    required: "Please provide your name"
  },
  email: {
    label: "Email Address",
    placeholder: "you@example.com",
    required: "Email address is required",
    invalid: "Please enter a valid email format"
  }
},
```

### Button and Status Messages

```typescript
buttonText: "Send Me Job Updates",
loadingText: "Processing Your Request...",
successHeading: "You're All Set!",
successDescription: "Thanks for subscribing to our job alerts. You'll start receiving job notifications soon.",
resetButtonText: "Subscribe Another Email",
```

### Toast Notifications

```typescript
toast: {
  success: {
    title: "Successfully Subscribed",
    description: "You'll now receive job alerts when new positions are posted."
  },
  rateLimit: {
    title: "Too Many Attempts",
    description: "Please wait a moment before trying again."
  },
  error: {
    title: "Subscription Failed",
    description: "There was a problem processing your subscription. Please try again later."
  }
}
```

## Advanced Customization

### Custom Form Components

If you need to modify the form beyond what's available in the configuration, you can customize the React components directly:

1. Copy `components/job-alerts/JobAlertsForm.tsx` to a custom components directory
2. Modify the component to include additional fields or styling
3. Update the `app/job-alerts/page.tsx` file to use your custom component

### Additional Form Fields

To add more fields to the subscription form:

1. Modify the form component to include additional fields
2. Update the form submission handler to include the new fields
3. Update the API route in `app/api/subscribe/route.ts` to process the new fields
4. Configure your email provider to store the additional data

## Creating Email Campaigns

Once users subscribe to job alerts, you'll need to set up campaigns in your email provider to send notifications. Here's how to do this with common providers:

### Encharge

1. Create a flow triggered by the "Job Alert Subscription" event
2. Set up an automation that sends a welcome email immediately
3. Configure a recurring email (e.g., weekly) that pulls recent jobs from your job board
4. Use Encharge's segmentation to personalize alerts based on user preferences

### Other Providers

For other email providers, the general process is:

1. Set up a list or segment for job alert subscribers
2. Create an automated welcome sequence
3. Configure a recurring campaign to send new job listings
4. Set up templates that match your job board's branding

## Troubleshooting

### Job Alerts Not Showing in Navigation

**Issue**: The job alerts page link is not appearing in the navigation or footer.

**Solution**: 
1. Ensure `jobAlerts.enabled` is set to `true`
2. Check that `showInNavigation` and/or `showInFooter` are set to `true`
3. Verify that your navigation menu is correctly configured

### Subscription Form Not Working

**Issue**: Users can't subscribe to job alerts; form submissions fail.

**Solution**:
1. Check that your email provider is correctly configured
2. Verify that the API key for your email provider is valid
3. Check the browser console and server logs for specific error messages
4. Test the API endpoint directly using a tool like Postman

### Email Provider Not Receiving Subscriptions

**Issue**: Subscribers are not appearing in your email provider's dashboard.

**Solution**:
1. Verify that the correct provider is specified in `jobAlerts.provider`
2. Ensure the provider name matches exactly what's configured in the `email` section
3. Check that all required fields in your provider's API are being sent
4. Look for any rate limiting or API restrictions from your provider

### Rate Limiting Issues

**Issue**: Users see "Rate limit exceeded" messages when trying to subscribe.

**Solution**:
1. Bordful implements rate limiting to prevent abuse
2. If legitimate users are being rate-limited, consider adjusting the limits in `lib/utils/rateLimit.ts`
3. Add appropriate retry logic or user guidance in your form

## Best Practices

### Email Content

- Keep job alert emails concise and focused
- Include only relevant jobs based on user preferences
- Provide clear CTAs to view the full job details
- Use responsive email templates for mobile compatibility

### Subscription Form Placement

- Add a subscription CTA on individual job pages for interested candidates
- Consider a subtle slide-in or popup for first-time visitors
- Include a subscription option in the site footer
- Add reminders on search results pages with no or few results

### User Experience

- Make unsubscribing easy (required by law in many jurisdictions)
- Provide preference options when possible (frequency, job types, etc.)
- Send an immediate confirmation email when users subscribe
- Include clear expectations about email frequency in your form

## Disabling Job Alerts

If you don't want to offer job alerts on your site, you can disable the feature:

```typescript
jobAlerts: {
  enabled: false,
  // Other settings will be ignored when disabled
},
```

When disabled:
1. The job alerts page will redirect to the home page
2. The subscription API endpoint will return a 404 error
3. All navigation and footer links to job alerts will be hidden

## Related Documentation

- [Email Provider Integration](/docs/guides/email-integration.md)
- [Encharge Integration](/docs/integrations/encharge.md)
- [Navigation Customization](/docs/guides/navigation.md)
- [Footer Customization](/docs/guides/footer.md)
- [Hero Section Customization](/docs/guides/hero-section.md) 