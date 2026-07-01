---
title: Third-Party Service Integrations
description: Learn how to integrate Bordful with various third-party services and platforms to extend functionality.
lastUpdated: "2025-05-22"
---

# Third-Party Service Integrations

Bordful is designed to work seamlessly with a variety of third-party services to extend its functionality. This guide covers all available third-party integrations, with configuration instructions and best practices.

## Integration Philosophy

Bordful's approach to third-party integrations follows these principles:

1. **Configuration-First**: Most integrations can be enabled and configured without code changes
2. **API Security**: API keys and credentials are stored securely in environment variables
3. **Minimal Dependencies**: We minimize external dependencies to keep the codebase lean
4. **Performance Focus**: Integrations are implemented with performance in mind
5. **Extensibility**: The system is designed to be easily extended with new integrations

## Available Integrations

### Social Media Integrations

#### Twitter/X

Integrate your job board with Twitter/X to share job listings and updates.

**Configuration**:

```typescript
// config/config.ts
social: {
  twitter: {
    username: "yourusername",
    shareText: "Check out this job: {{jobTitle}} at {{companyName}} - {{jobUrl}}",
    hashTags: ["jobs", "careers", "hiring"],
  }
}
```

**Features**:
- Share buttons on job listings
- Twitter/X cards for rich job previews
- Automatic hashtag inclusion

#### LinkedIn

Enable LinkedIn integration for professional networking and job sharing.

**Configuration**:

```typescript
// config/config.ts
social: {
  linkedin: {
    companyId: "your-company-id",
    shareText: "We're hiring: {{jobTitle}} - Apply now!",
  }
}
```

**Features**:
- LinkedIn share buttons on job listings
- Rich job previews in LinkedIn shares
- Company page integration

### Payment Providers

#### Stripe

Integrate Stripe for processing job listing payments.

**Configuration**:

```typescript
// config/config.ts
payments: {
  provider: "stripe",
  stripe: {
    publicKey: process.env.STRIPE_PUBLIC_KEY,
    priceId: process.env.STRIPE_PRICE_ID,
    successUrl: "/payment/success",
    cancelUrl: "/payment/cancel",
  }
}
```

**Environment Variables**:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

**Features**:
- Secure payment processing
- Subscription management
- Webhook integration for event handling

### Notification Services

#### Slack

Integrate with Slack to receive notifications about new job submissions, applications, and other events.

**Configuration**:

```typescript
// config/config.ts
notifications: {
  slack: {
    enabled: true,
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    events: ["newJob", "jobApplication", "subscription"],
    channel: "#job-board",
  }
}
```

**Environment Variables**:
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Features**:
- Real-time notifications for new job submissions
- Customizable notification content
- Channel targeting

#### Discord

Integrate with Discord for community notifications and updates.

**Configuration**:

```typescript
// config/config.ts
notifications: {
  discord: {
    enabled: true,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    events: ["newJob", "jobApplication"],
    username: "Job Board Bot",
    avatarUrl: "https://yourdomain.com/images/bot-avatar.png",
  }
}
```

**Environment Variables**:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**Features**:
- Customizable bot username and avatar
- Rich embeds for job listings
- Event-based notifications

### SEO and Marketing Integrations

#### Google Jobs

Optimize your job listings for Google Jobs search results.

**Configuration**:

```typescript
// config/config.ts
seo: {
  googleJobs: {
    enabled: true,
    enhancedStructuredData: true,
    defaultEmploymentType: "FULL_TIME",
    defaultJobLocationType: "TELECOMMUTE", // For remote jobs
  }
}
```

**Features**:
- Structured data generation for job listings
- Google Jobs search integration
- Enhanced visibility in Google search results

#### Mailchimp

Integrate with Mailchimp for email marketing campaigns.

**Configuration**:

```typescript
// config/config.ts
email: {
  provider: "mailchimp",
  mailchimp: {
    apiKey: process.env.MAILCHIMP_API_KEY,
    serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX,
    listId: process.env.MAILCHIMP_LIST_ID,
    tags: ["job-alert-subscriber"],
  }
}
```

**Environment Variables**:
```
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_LIST_ID=your-list-id
```

**Features**:
- Subscriber management
- Automated email campaigns
- Tag-based segmentation

### Chat and Support Integrations

#### Intercom

Integrate Intercom for user support and engagement.

**Configuration**:

```typescript
// config/config.ts
scripts: {
  head: [
    {
      src: "https://widget.intercom.io/widget/your-app-id",
      strategy: "afterInteractive",
    }
  ]
}
```

**Features**:
- Live chat support
- User engagement tracking
- Automated messages

#### Crisp

Integrate Crisp for customer support and chat functionality.

**Configuration**:

```typescript
// config/config.ts
scripts: {
  head: [
    {
      src: "/support/crisp.js",
      strategy: "afterInteractive",
      attributes: {
        "data-website-id": process.env.CRISP_WEBSITE_ID,
      }
    }
  ]
}
```

Create a file at `public/support/crisp.js` with:

```javascript
window.$crisp = [];
window.CRISP_WEBSITE_ID = document.currentScript.getAttribute("data-website-id");
(function() {
  const d = document;
  const s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();
```

**Environment Variables**:
```
CRISP_WEBSITE_ID=your-website-id
```

**Features**:
- Live chat support
- Visitor tracking
- Chatbot capabilities

## Integration Best Practices

### Security Considerations

1. **Store API keys securely**:
   - Never hardcode API keys in your codebase
   - Use environment variables for all credentials
   - Consider using a secret manager for production environments

2. **Validate input data**:
   - Sanitize all data before sending to third-party services
   - Implement proper error handling for API responses
   - Use TypeScript types for API payloads

3. **Minimize permissions**:
   - Use the principle of least privilege for API keys
   - Only request necessary permissions from third-party services
   - Regularly audit and rotate API keys

### Performance Optimization

1. **Lazy loading**:
   - Use appropriate loading strategies for third-party scripts
   - Load non-critical integrations after the page is interactive
   - Consider loading chat widgets on user interaction

2. **Minimize API calls**:
   - Batch API requests when possible
   - Implement caching for frequently used data
   - Use webhooks instead of polling where applicable

3. **Error resilience**:
   - Implement fallbacks for failed API calls
   - Add timeouts to prevent hanging requests
   - Log integration errors for debugging

### Implementation Guidelines

1. **Follow provider guidelines**:
   - Adhere to each service's terms of service
   - Follow recommended implementation patterns
   - Stay updated with API changes

2. **Test thoroughly**:
   - Test integrations in development environments
   - Verify webhook functionality
   - Check error handling scenarios

3. **Monitor usage**:
   - Track API usage to avoid hitting limits
   - Monitor costs for paid services
   - Set up alerts for unusual activity

## Adding a Custom Integration

If you need to integrate with a service not listed here, you can create a custom integration:

1. **Identify the integration point**:
   - Determine which part of Bordful needs to interact with the service
   - Identify the data that needs to be exchanged
   - Choose the appropriate integration method (API, webhook, script)

2. **Create the integration code**:
   - Add a new file in the appropriate directory (e.g., `lib/integrations/`)
   - Implement the necessary API calls or webhook handlers
   - Add TypeScript types for the integration

3. **Add configuration options**:
   - Update `config/config.ts` with new configuration options
   - Document required environment variables
   - Add validation for configuration values

4. **Test and document**:
   - Test the integration thoroughly
   - Document the integration in your custom documentation
   - Consider contributing the integration back to Bordful

## Troubleshooting Common Issues

### API Authentication Failures

**Problem**: Third-party API calls fail with authentication errors.

**Solutions**:
- Verify API keys are correctly set in environment variables
- Check if the API key has the necessary permissions
- Ensure the API key is still valid and not expired
- Verify the API endpoint URL is correct

### Webhook Integration Issues

**Problem**: Webhooks are not being received or processed.

**Solutions**:
- Verify the webhook URL is publicly accessible
- Check if the webhook secret is correctly configured
- Look for any firewall or security restrictions
- Implement webhook logging for debugging
- Test webhooks using the service's test functionality

### Script Loading Problems

**Problem**: Third-party scripts fail to load or cause errors.

**Solutions**:
- Check browser console for specific error messages
- Verify the script URL is correct and accessible
- Ensure the script is loaded with the appropriate strategy
- Test for conflicts with other scripts
- Consider using a content security policy

## Related Documentation

- [Email Provider Integration](/docs/guides/email-integration.md) - Email service integration guide
- [Analytics Platform Integrations](/docs/integrations/analytics-platforms.md) - Analytics integration guide
- [Custom Integration Development](/docs/advanced/custom-integrations.md) - Creating custom integrations 