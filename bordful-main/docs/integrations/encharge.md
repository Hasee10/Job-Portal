---
title: Encharge Integration
description: Set up Encharge.io integration for job alerts and email automation in your Bordful job board.
lastUpdated: "2025-05-22"
---

# Encharge Integration

[Encharge](https://encharge.io) is a marketing automation platform that allows you to create advanced email workflows for your Bordful job board, particularly for job alerts and subscriber management.

## Overview

Encharge integration provides several key benefits:

- Automated job alert emails to subscribers
- Welcome sequences for new subscribers
- Segmentation based on user preferences
- Detailed subscriber analytics
- Advanced automation workflows
- GDPR-compliant subscriber management

This guide covers the complete setup process for integrating Encharge with Bordful.

## Prerequisites

Before you begin, ensure you have:

1. An Encharge.io account ([sign up here](https://app.encharge.io/signup) if needed)
2. Access to your Encharge dashboard
3. Permission to create API keys and custom fields

## Step 1: Get Your Encharge API Key

1. Log in to your [Encharge dashboard](https://app.encharge.io/)
2. Navigate to **Settings > API**
3. Create a new API key with write permissions
4. Copy your API key (you'll need it for Bordful configuration)

## Step 2: Configure Custom Fields in Encharge

For optimal data collection and segmentation, create the following custom fields in Encharge:

1. Go to **Settings > Custom Fields**
2. Create these fields:

| Field Name              | Field Type | Description                      |
| ----------------------- | ---------- | -------------------------------- |
| `subscriptionDate`      | Date       | Date when user subscribed        |
| `subscriptionTimestamp` | Number     | Unix timestamp of subscription   |
| `referer`               | Text       | Where the subscriber came from   |
| `origin`                | Text       | Your website URL                 |
| `userAgent`             | Text       | Browser/device information       |
| `ip`                    | Text       | IP address for geolocation       |
| `hasName`               | Boolean    | Whether user provided their name |

## Step 3: Set Up Tags in Encharge

Create the following tags to automatically categorize subscribers:

1. Go to **People > Tags**
2. Create these tags:
   - `job-alerts-subscriber` - Main tag for all job alert subscribers
   - `website-form` - Indicates subscription via website form
   - `api-route` - Indicates subscription via API
   - `bordful-user` - Identifies users from your Bordful job board

## Step 4: Configure Bordful to Use Encharge

### Option A: Environment Variables (Recommended for Production)

1. Add these variables to your `.env` or hosting platform:

```
EMAIL_PROVIDER=encharge
ENCHARGE_WRITE_KEY=your_encharge_write_key_here
```

2. Restart your development server or redeploy your application

### Option B: Configuration File

1. Edit your `config/config.ts` file:

```typescript
email: {
  // Default provider
  provider: process.env.EMAIL_PROVIDER || "encharge",
  
  // Encharge-specific configuration
  encharge: {
    // Your Encharge write key (from Settings > API)
    writeKey: process.env.ENCHARGE_WRITE_KEY || "your_encharge_write_key",
    
    // Tags to apply to all subscribers (comma-separated)
    defaultTags: "job-alerts-subscriber, bordful-user",
    
    // Event name for subscription tracking
    eventName: "Job Alert Subscription",
  },
},
```

## Step 5: Create Email Templates in Encharge

For a complete job alerts system, you'll need at least two email templates:

### 1. Subscription Confirmation Email

Create a welcome email that:
- Confirms their subscription
- Sets expectations for frequency and content
- Provides an unsubscribe option (required by law)
- Reinforces the value of your job alerts

### 2. Job Alerts Digest Email

Create a recurring email template that:
- Features new job listings since the last alert
- Categorizes jobs by type, level, or location
- Includes salary information when available
- Has clear "Apply Now" buttons
- Includes your branding and design elements

## Step 6: Set Up Automation Flows

### Welcome Flow

1. Go to **Flows** in your Encharge dashboard
2. Create a new flow triggered by the "Person added tag" event
3. Select the `job-alerts-subscriber` tag as the trigger
4. Add steps:
   - Send the welcome email immediately
   - Wait 3 days
   - Send a follow-up email with featured jobs
   - Add to your regular digest list

### Weekly Job Digest Flow

1. Create a new flow triggered by a schedule (e.g., every Monday)
2. Add a filter step that includes only people with the `job-alerts-subscriber` tag
3. Send your job digest email
4. (Optional) Add engagement tracking steps

## Advanced Configuration

### Custom Tags

You can customize the tags sent to Encharge by modifying the `defaultTags` property:

```typescript
encharge: {
  writeKey: process.env.ENCHARGE_WRITE_KEY,
  defaultTags: "job-alerts-subscriber, premium-user, tech-jobs",
  eventName: "Job Alert Subscription",
}
```

### Custom Event Names

Change the event name used for subscription tracking:

```typescript
encharge: {
  writeKey: process.env.ENCHARGE_WRITE_KEY,
  defaultTags: "job-alerts-subscriber",
  eventName: "Custom Job Alert Registration", // Custom event name
}
```

### Segmentation by Job Categories

To segment subscribers by job interest:

1. Modify the job alerts form to include job category preferences
2. Update the API route to send these preferences to Encharge
3. Create tags in Encharge for each job category
4. Use these tags for targeted email campaigns

## Testing the Integration

To verify your Encharge integration is working:

1. Subscribe to job alerts on your site using a test email
2. Check your Encharge dashboard to confirm the person was added
3. Verify that all custom fields are populated
4. Confirm that the appropriate tags were applied
5. Check that your welcome flow was triggered

## Troubleshooting

### Common Issues

1. **Subscribers Not Appearing in Encharge**
   - Verify your API key is correct and has write permissions
   - Check that the Encharge integration is properly configured
   - Look for errors in your server logs

2. **Custom Fields Not Populated**
   - Ensure field names match exactly (case-sensitive)
   - Verify fields are created in Encharge before sending data
   - Check data formatting for each field type

3. **Automation Flows Not Triggering**
   - Verify trigger conditions are correctly set
   - Check that tags are being applied properly
   - Test the flow manually with a test person

## GDPR Compliance

For European users, ensure your integration is GDPR compliant:

1. Include clear consent language on your subscription form
2. Provide an easy unsubscribe option in all emails
3. Document your data collection in your privacy policy
4. Implement data deletion upon request
5. Store subscriber IP addresses securely

## Related Documentation

- [Job Alerts Configuration](/docs/guides/job-alerts.md)
- [Email Provider Integration](/docs/guides/email-integration.md)
- [Subscription Form Customization](/docs/guides/job-alerts.md#customizing-the-subscription-form) 