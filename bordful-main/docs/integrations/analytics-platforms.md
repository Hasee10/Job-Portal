---
title: Analytics Platform Integrations
description: Learn how to integrate analytics platforms with your Bordful job board for user tracking and performance insights.
lastUpdated: "2025-05-22"
---

# Analytics Platform Integrations

Bordful provides a flexible way to integrate various analytics platforms to track user behavior, measure performance, and gather insights about your job board. This guide explains how to integrate popular analytics platforms and maximize their effectiveness.

## Integration Architecture

Bordful uses Next.js's Script component to integrate analytics platforms with optimal loading strategies. This approach provides:

1. **Performance Optimization**: Scripts load using the appropriate strategy for minimal performance impact
2. **Configuration-Based Setup**: No code changes required, just update your config file
3. **Attribute Support**: Full support for custom attributes and parameters
4. **Loading Strategies**: Support for different loading priorities (beforeInteractive, afterInteractive, lazyOnload)

## Analytics Integration Options

You can integrate analytics platforms in two ways:

### 1. Using the Script Configuration

The recommended approach is to use the script configuration in your `config/config.ts` file:

```typescript
// config/config.ts
scripts: {
  head: [
    // Scripts to be loaded in <head>
    {
      src: "https://analytics.example.com/script.js",
      strategy: "afterInteractive", // Best for analytics
      attributes: {
        "data-website-id": "your-website-id",
        defer: "",  // Boolean attributes should use empty string
      }
    }
  ],
  body: [
    // Scripts to be loaded at end of <body>
    // Less critical scripts go here
  ]
}
```

### 2. Using Environment Variables

For some common analytics platforms, you can use environment variables:

```
# .env or .env.local
ANALYTICS_PROVIDER=google
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## Supported Analytics Platforms

### Google Analytics 4

Google Analytics 4 (GA4) is Google's latest analytics platform, offering enhanced measurement and tracking capabilities.

#### Configuration

```typescript
// config/config.ts
scripts: {
  head: [
    {
      src: `https://www.googletagmanager.com/gtag/js?id=${process.env.GOOGLE_ANALYTICS_ID}`,
      strategy: "afterInteractive",
    },
    {
      src: `/analytics/google-analytics.js`, // Custom initialization script
      strategy: "afterInteractive",
      attributes: {
        "data-measurement-id": process.env.GOOGLE_ANALYTICS_ID,
      }
    }
  ]
}
```

The `/analytics/google-analytics.js` file should be created in your public directory with the following content:

```javascript
// public/analytics/google-analytics.js
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

// Get the measurement ID from the script tag
const measurementId = document.currentScript.getAttribute('data-measurement-id');
gtag('config', measurementId);
```

#### Key Events to Track

- **Job Views**: Track when users view job details
- **Job Application Clicks**: Track when users click "Apply" buttons
- **Filter Usage**: Track which filters users apply
- **Search Queries**: Track what users search for
- **Subscription Events**: Track job alert subscriptions

### Plausible Analytics

[Plausible](https://plausible.io) is a privacy-friendly analytics platform that doesn't use cookies and is fully compliant with GDPR, CCPA, and PECR.

#### Configuration

```typescript
// config/config.ts
scripts: {
  head: [
    {
      src: "https://plausible.io/js/script.js",
      strategy: "afterInteractive",
      attributes: {
        "data-domain": "yourdomain.com",
        defer: "",
      }
    }
  ]
}
```

#### Custom Events

To track custom events with Plausible:

```javascript
// Example tracking code to add in your components
function trackJobApplication(jobId, jobTitle) {
  if (window.plausible) {
    window.plausible('Job Application', {
      props: {
        jobId: jobId,
        jobTitle: jobTitle
      }
    });
  }
}
```

### Umami

[Umami](https://umami.is) is an open-source, privacy-focused alternative to Google Analytics.

#### Configuration

```typescript
// config/config.ts
scripts: {
  head: [
    {
      src: "https://analytics.umami.is/script.js",
      strategy: "afterInteractive",
      attributes: {
        "data-website-id": "your-umami-website-id",
        defer: "",
      }
    }
  ]
}
```

#### Self-Hosted Umami

If you're self-hosting Umami, adjust the URL accordingly:

```typescript
{
  src: "https://your-umami-instance.com/script.js",
  strategy: "afterInteractive",
  attributes: {
    "data-website-id": "your-umami-website-id",
    defer: "",
  }
}
```

### Fathom Analytics

[Fathom](https://usefathom.com) is a simple, light-weight, privacy-focused analytics platform.

#### Configuration

```typescript
// config/config.ts
scripts: {
  head: [
    {
      src: "https://cdn.usefathom.com/script.js",
      strategy: "afterInteractive",
      attributes: {
        "data-site": "your-fathom-site-id",
        defer: "",
      }
    }
  ]
}
```

## Advanced Analytics Configurations

### Tracking Custom Events

To track custom events (like job applications or filter usage), you can create custom JavaScript functions:

```typescript
// lib/utils/analytics.ts
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, properties);
  }
  
  // Plausible
  if (window.plausible) {
    window.plausible(eventName, { props: properties });
  }
  
  // Fathom
  if (window.fathom) {
    window.fathom.trackGoal(eventName, properties?.value || 0);
  }
  
  // Umami
  if (window.umami) {
    window.umami.track(eventName, properties);
  }
}
```

Then use this function in your components:

```typescript
import { trackEvent } from '@/lib/utils/analytics';

// In your component
function handleJobApplication(jobId, jobTitle) {
  // Handle the application...
  
  // Track the event
  trackEvent('job_application', {
    job_id: jobId,
    job_title: jobTitle,
    application_source: 'job_details_page'
  });
}
```

### Tracking Page Views

Next.js provides a router that can be used to track page views:

```typescript
// _app.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  useEffect(() => {
    // Track page views when the route changes
    const handleRouteChange = (url) => {
      // Google Analytics
      if (window.gtag) {
        window.gtag('config', 'YOUR-GA-ID', {
          page_path: url,
        });
      }
      
      // Other analytics platforms have their own page view tracking
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
  
  return <Component {...pageProps} />;
}
```

## Best Practices for Analytics Integration

### Performance Optimization

1. **Use appropriate loading strategies**:
   - Use `afterInteractive` for most analytics scripts
   - Use `lazyOnload` for less critical tracking
   - Avoid `beforeInteractive` for analytics to prevent blocking page rendering

2. **Minimize script size**:
   - Choose lightweight analytics platforms when possible
   - Use modern CDN-hosted versions of scripts
   - Consider using tag managers to control script loading

### Data Quality

1. **Consistent event naming**:
   - Use snake_case for event names (e.g., `job_application`)
   - Create a standardized event naming convention
   - Document all events and their properties

2. **Use UTM parameters**:
   - Implement UTM parameter tracking for marketing campaigns
   - Pass UTM data to your analytics platform
   - Track conversion rates by traffic source

### Privacy Compliance

1. **Cookie consent**:
   - Implement a cookie consent banner if using cookie-based analytics
   - Only load analytics after consent for GDPR compliance
   - Consider cookie-less alternatives like Plausible or Fathom

2. **Data minimization**:
   - Only collect data you actually need
   - Avoid tracking personal identifiable information (PII)
   - Use IP anonymization when available

## Related Documentation

- [Script Management](/docs/advanced/script-management.md) - Detailed guide on script loading strategies
- [Custom Integration Development](/docs/advanced/custom-integrations.md) - Creating custom integrations
- [Job Alerts Analytics](/docs/guides/job-alerts.md#analytics) - Tracking job alert subscriptions 