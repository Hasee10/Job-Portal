---
title: Email Providers Documentation
description: Comprehensive documentation for all supported email providers in Bordful job board.
lastUpdated: "2025-05-22"
---

# Email Providers Documentation

Bordful includes support for multiple email providers to handle job alert subscriptions and other email-based functionality. This guide documents all supported email providers, their configuration options, and implementation details.

## Provider Architecture

Bordful uses a flexible, provider-based architecture for email integration:

1. A common interface (`EmailProvider`) that all providers implement
2. A central service that routes to the appropriate provider
3. Environment variables or configuration options for provider settings
4. Server-side API routes for secure handling of subscription data

This architecture allows for easy extension with new providers and consistent behavior across different email services.

## Currently Supported Providers

### Encharge

[Encharge](https://encharge.io) is a marketing automation platform that allows you to create advanced email workflows, trigger-based campaigns, and sophisticated customer journeys.

#### Configuration

```typescript
// config/config.ts
email: {
  provider: "encharge",
  encharge: {
    // Your Encharge write key (from Encharge dashboard)
    writeKey: process.env.ENCHARGE_WRITE_KEY || "your_key_here",
    
    // Tags to apply to all subscribers (comma-separated)
    defaultTags: "job-alerts-subscriber",
    
    // Event name used when tracking subscriptions
    eventName: "Job Alert Subscription",
  }
},
```

#### Features

- **Event-Based Integration**: Uses Encharge's event tracking API
- **Rich User Properties**: Sends subscriber name, email, and metadata
- **Tagging Support**: Automatic tagging of subscribers for segmentation
- **IP Collection**: Captures IP address for geolocation (optional)
- **Custom Properties**: Supports sending arbitrary metadata fields

#### Implementation Details

Encharge integration is implemented in `lib/email/providers/encharge.ts` and uses Encharge's REST API to send events when users subscribe to job alerts. The integration:

1. Formats the user data according to Encharge's API requirements
2. Splits the subscriber's name into first and last name
3. Adds tags and timestamps to the payload
4. Makes a secure server-side API call to Encharge's endpoint
5. Handles errors and returns appropriate responses

#### Environment Variables

| Variable Name        | Description                            | Required                  |
| -------------------- | -------------------------------------- | ------------------------- |
| `ENCHARGE_WRITE_KEY` | Your Encharge write key                | Yes (in production)       |
| `EMAIL_PROVIDER`     | Set to "encharge" to use this provider | No (can be set in config) |

#### Related Documentation

For detailed setup instructions, see the [Encharge Integration Guide](/docs/integrations/encharge.md).

## Planned Future Providers

Bordful is designed to be extensible with additional email providers. The following providers are planned for future releases:

### Mailchimp

[Mailchimp](https://mailchimp.com) is a popular email marketing platform with list-based subscriber management.

#### Planned Implementation

The Mailchimp integration will:
- Support adding subscribers to specific lists
- Include tags and custom fields
- Support Mailchimp's interest groups
- Leverage Mailchimp's marketing API

### SendGrid

[SendGrid](https://sendgrid.com) is a cloud-based email service that provides reliable email delivery.

#### Planned Implementation

The SendGrid integration will:
- Support marketing campaigns and contacts API
- Include custom fields and lists
- Support SendGrid's segmentation features
- Leverage SendGrid's marketing API

### ConvertKit

[ConvertKit](https://convertkit.com) is an email marketing platform designed for creators.

#### Planned Implementation

The ConvertKit integration will:
- Support adding subscribers to forms and sequences
- Include tags and custom fields
- Support ConvertKit's automation features
- Leverage ConvertKit's API for subscriber management

## Adding a Custom Provider

Bordful's email provider system is designed to be easily extensible. To add a custom provider:

1. Create a new file in `lib/email/providers/` (e.g., `custom-provider.ts`)
2. Implement the `EmailProvider` interface from `lib/email/types.ts`:

```typescript
import { EmailProvider, SubscriberData, EmailProviderError } from "../types";

export class CustomProvider implements EmailProvider {
  name = "custom-provider";
  
  constructor() {
    // Initialize with configuration
  }
  
  async subscribe(data: SubscriberData) {
    try {
      // Implement subscription logic
      // Return success object
      return { success: true };
    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : "Subscription failed";
      throw new EmailProviderError(errorMessage, "custom-provider");
    }
  }
}
```

3. Update `lib/email/index.ts` to include your new provider
4. Add configuration options to your `config/config.ts` file

## Provider Interface

All email providers implement the following interface:

```typescript
interface SubscriberData {
  email: string;
  name?: string;
  ip?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

interface EmailProvider {
  name: string;
  subscribe(data: SubscriberData): Promise<{
    success: boolean;
    error?: string;
  }>;
}
```

This standardized interface ensures that all providers behave consistently and can be used interchangeably.

## Switching Providers

To switch between email providers:

1. Update the `provider` property in your configuration:
   ```typescript
   email: {
     provider: "new-provider",
     // Provider-specific configuration
   }
   ```

2. Or update the `EMAIL_PROVIDER` environment variable:
   ```
   EMAIL_PROVIDER=new-provider
   ```

3. Ensure that the new provider is properly configured with any required API keys or settings

## Troubleshooting Provider Issues

### Common Provider Errors

1. **Authentication Failures**
   - Ensure API keys are correctly set
   - Verify that keys have appropriate permissions
   - Check for typos in API keys or endpoints

2. **Rate Limiting**
   - Implement retry logic for rate-limited requests
   - Check provider documentation for rate limits
   - Consider batching subscribers for bulk operations

3. **Invalid Data Format**
   - Ensure email addresses are valid
   - Check that required fields are properly formatted
   - Review provider documentation for specific format requirements

### Provider-Specific Troubleshooting

#### Encharge Issues

- **Subscribers Not Appearing**: Verify your Encharge write key has appropriate permissions
- **Events Not Triggering**: Check that the event name matches your Encharge automation triggers
- **Field Mapping Problems**: Ensure custom fields are correctly set up in Encharge

## Related Documentation

- [Email Provider Integration](/docs/guides/email-integration.md) - General guide for email integration
- [Encharge Integration](/docs/integrations/encharge.md) - Detailed Encharge setup guide
- [Job Alerts Configuration](/docs/guides/job-alerts.md) - Setting up job alerts with email providers 