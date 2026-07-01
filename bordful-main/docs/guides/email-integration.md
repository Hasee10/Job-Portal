---
title: Email Provider Integration
description: Learn how to configure and customize email provider integrations for job alerts in your Bordful job board.
lastUpdated: "2025-05-22"
---

# Email Provider Integration

Bordful includes a flexible email provider system for handling job alert subscriptions. This feature allows users to subscribe to receive notifications when new jobs are posted that match their interests.

## Overview

The email integration system in Bordful is designed to be:

- Provider-agnostic with support for multiple email services
- Secure with server-side API handling
- Rich in metadata collection for better targeting
- Flexible with multiple configuration options
- Easy to extend with new providers

Currently, Encharge is fully implemented, with support for other providers planned for future releases.

## Key Features

- **Server-side API Route**: Secure handling of subscription data
- **Multiple Configuration Options**: Environment variables or config file
- **Enhanced Data Collection**: IP address, referrer, user agent, and more
- **Flexible Provider System**: Currently supports Encharge with more providers planned
- **Rich Segmentation Data**: Enables targeted email campaigns

## Configuration Options

You have two options for configuring email providers:

### Option 1: Environment Variables (Recommended for Production)

1. Copy `.env.example` to `.env.local` (for development) or set environment variables in your hosting platform
2. Set the following variables:
   ```
   EMAIL_PROVIDER=encharge
   ENCHARGE_WRITE_KEY=your_encharge_write_key_here
   ```
3. Restart your development server

### Option 2: Configuration File (For Advanced Customization)

1. Copy `config/config.example.ts` to `config/config.ts`
2. Customize the email provider settings:
   ```typescript
   email: {
     provider: "encharge",
     encharge: {
       writeKey: process.env.ENCHARGE_WRITE_KEY || "your_key_here",
       defaultTags: "job-alerts-subscriber, custom-tag",
       eventName: "Job Alert Subscription",
     }
   },
   ```

## Supported Providers

### Encharge Integration

[Encharge](https://encharge.io) is a marketing automation platform that allows you to create advanced email workflows.

For detailed Encharge setup instructions, see our [Encharge Integration Guide](/docs/integrations/encharge.md).

### Future Providers

Support for additional email providers is planned for future releases. The system is designed to be easily extensible with new providers through the provider interface in `lib/email/types.ts`.

## Data Collection

The integration automatically collects and sends the following data:

- **User Information**:
  - Email address (required)
  - Name (optional)
  - IP address (for geolocation)
  
- **Technical Data**:
  - User agent (browser and device information)
  - Referrer URL (where the user came from)
  - Origin URL (your website)
  
- **Timestamps**:
  - Subscription timestamp (Unix timestamp)
  - Formatted subscription date
  
- **Segmentation**:
  - Whether the user provided a name
  - Tags for categorizing subscribers

This rich data enables advanced segmentation and personalization in your email campaigns.

## Security Considerations

The email integration is built with security in mind:

- API keys are never exposed to the client
- All API calls are made server-side
- User data is validated before being sent to the provider
- IP addresses are collected securely from request headers
- Rate limiting is applied to prevent abuse

## Development Mode

In development mode, the system works even without a provider API key by simulating a successful subscription. This allows you to test the form functionality without setting up an actual provider account.

To enable development mode, simply run the application in development mode without setting the provider API key.

## Customizing the Subscription Form

The job alerts subscription form is located in `components/job-alerts/SubscriptionForm.tsx`. You can customize this component to match your branding or add additional fields.

### Available Form Fields

- **Email**: Required field for the subscriber's email address
- **Name**: Optional field for the subscriber's name
- **Custom Fields**: You can add additional fields as needed

### Adding Custom Fields

To add custom fields to the subscription form:

1. Add the field to the form component
2. Update the subscription API route to handle the new field
3. Update the email provider integration to send the new field

## Implementation Details

The email integration is implemented through several key files:

- `app/api/subscribe/route.ts`: The API route that handles subscription requests
- `lib/email/index.ts`: The main email service that routes to the appropriate provider
- `lib/email/providers/encharge.ts`: The Encharge provider implementation
- `lib/email/types.ts`: TypeScript interfaces for the email provider system

## Advanced Usage

### Customizing Tags

You can customize the tags sent to your email provider by modifying the `defaultTags` property in your configuration:

```typescript
email: {
  provider: "encharge",
  encharge: {
    writeKey: process.env.ENCHARGE_WRITE_KEY || "your_key_here",
    defaultTags: "job-alerts-subscriber, premium-user, web-signup",
    eventName: "Job Alert Subscription",
  }
},
```

### Custom Event Names

You can customize the event name used when tracking subscriptions:

```typescript
email: {
  provider: "encharge",
  encharge: {
    writeKey: process.env.ENCHARGE_WRITE_KEY || "your_key_here",
    defaultTags: "job-alerts-subscriber",
    eventName: "Custom Subscription Event", // Custom event name
  }
},
```

### Adding a New Provider

To add a new email provider:

1. Create a new file in `lib/email/providers/` (e.g., `mailchimp.ts`)
2. Implement the `EmailProvider` interface from `lib/email/types.ts`
3. Update `lib/email/index.ts` to include your new provider
4. Add the provider option to the configuration system

## Troubleshooting

### Common Issues

1. **Subscription Not Working**
   - Verify that the API key is correctly set in your environment or config file
   - Check that the API route is correctly configured
   - Ensure the form is submitting to the correct endpoint

2. **Provider Not Receiving Data**
   - Check the browser console for errors
   - Verify that the provider is correctly configured
   - Ensure that the provider API is accessible from your server

3. **Validation Errors**
   - Ensure that the email address is valid
   - Check that required fields are provided
   - Verify that the form data is correctly formatted

## Email Templates

Create at least two email templates in Encharge:
1. **Subscription Confirmation** - Sent immediately after someone subscribes
2. **Job Alerts Digest** - Sent on a regular schedule with new job listings

For the job alerts digest, consider including:
- Featured jobs at the top
- Clear categorization by job type
- "Apply Now" buttons for each job
- Brief job descriptions with salary ranges

## Unsubscribe Management

Encharge automatically handles unsubscribe links in emails. When a user unsubscribes, they will be flagged in Encharge and will no longer receive emails.

For GDPR compliance, you may want to implement a specific endpoint for users to request complete removal of their data.

## Related Documentation

- [Job Alerts Configuration](/docs/guides/job-alerts.md)
- [API Endpoints](/docs/advanced/api-endpoints.md)