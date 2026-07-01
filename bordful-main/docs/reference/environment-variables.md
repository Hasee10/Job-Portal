---
title: Environment Variables Reference
description: Comprehensive documentation for all environment variables used by Bordful job board.
lastUpdated: "2025-05-22"
---

# Environment Variables Reference

Bordful uses environment variables for configuration that should not be committed to source control, such as API keys, database credentials, and deployment-specific settings. This reference documents all supported environment variables and their effects.

## Setting Environment Variables

### Development Environment

For local development, create a `.env` or `.env.local` file in the root of your project:

```
# Example .env file
NEXT_PUBLIC_APP_URL=http://localhost:3000
AIRTABLE_ACCESS_TOKEN=your_token_here
```

### Production Environment

In production, set environment variables according to your hosting platform:

- **Vercel**: Configure in the Vercel dashboard under "Settings > Environment Variables"
- **Netlify**: Configure in the Netlify dashboard under "Site settings > Build & deploy > Environment"
- **Self-hosted**: Set environment variables in your server configuration

## Core Environment Variables

### Application Configuration

| Variable              | Description                                                         | Required | Default       |
| --------------------- | ------------------------------------------------------------------- | -------- | ------------- |
| `NEXT_PUBLIC_APP_URL` | The full URL of your application (e.g., `https://jobs.example.com`) | Yes      | -             |
| `NODE_ENV`            | Environment mode (`development`, `production`, or `test`)           | No       | `development` |
| `PORT`                | Port number for the development server                              | No       | `3000`        |

### Database Connection

| Variable                | Description                        | Required | Default |
| ----------------------- | ---------------------------------- | -------- | ------- |
| `AIRTABLE_ACCESS_TOKEN` | Airtable Personal Access Token     | Yes      | -       |
| `AIRTABLE_BASE_ID`      | Airtable base ID                   | Yes      | -       |
| `AIRTABLE_TABLE_NAME`   | Name of the jobs table in Airtable | No       | `Jobs`  |

## Email Integration

### General Email Configuration

| Variable         | Description                                                   | Required | Default    |
| ---------------- | ------------------------------------------------------------- | -------- | ---------- |
| `EMAIL_PROVIDER` | Default email provider to use (`encharge`, `mailchimp`, etc.) | No       | `encharge` |
| `EMAIL_FROM`     | Default "From" email address for outgoing emails              | No       | -          |
| `EMAIL_REPLY_TO` | Default "Reply-To" email address for outgoing emails          | No       | -          |

### Encharge Integration

| Variable                | Description                                    | Required                | Default                  |
| ----------------------- | ---------------------------------------------- | ----------------------- | ------------------------ |
| `ENCHARGE_WRITE_KEY`    | Encharge API write key                         | Yes (if using Encharge) | -                        |
| `ENCHARGE_EVENT_NAME`   | Custom event name for Encharge tracking        | No                      | `Job Alert Subscription` |
| `ENCHARGE_DEFAULT_TAGS` | Default tags for subscribers (comma-separated) | No                      | `job-alerts-subscriber`  |

### Other Email Providers

| Variable                  | Description                           | Required                 | Default |
| ------------------------- | ------------------------------------- | ------------------------ | ------- |
| `MAILCHIMP_API_KEY`       | Mailchimp API key                     | Yes (if using Mailchimp) | -       |
| `MAILCHIMP_SERVER_PREFIX` | Mailchimp server prefix (e.g., `us1`) | Yes (if using Mailchimp) | -       |
| `MAILCHIMP_LIST_ID`       | Mailchimp audience/list ID            | Yes (if using Mailchimp) | -       |
| `SENDGRID_API_KEY`        | SendGrid API key                      | Yes (if using SendGrid)  | -       |
| `SENDGRID_LIST_IDS`       | SendGrid list IDs (comma-separated)   | No                       | -       |

## Analytics and Tracking

| Variable              | Description                                                           | Required | Default                                |
| --------------------- | --------------------------------------------------------------------- | -------- | -------------------------------------- |
| `ANALYTICS_PROVIDER`  | Default analytics provider (`google`, `plausible`, `umami`, `fathom`) | No       | -                                      |
| `GOOGLE_ANALYTICS_ID` | Google Analytics 4 measurement ID (G-XXXXXXXXXX)                      | No       | -                                      |
| `PLAUSIBLE_DOMAIN`    | Plausible domain name                                                 | No       | -                                      |
| `UMAMI_WEBSITE_ID`    | Umami website ID                                                      | No       | -                                      |
| `UMAMI_URL`           | Custom Umami server URL                                               | No       | `https://analytics.umami.is/script.js` |
| `FATHOM_SITE_ID`      | Fathom site ID                                                        | No       | -                                      |

## Payment Integration

| Variable                        | Description                              | Required           | Default |
| ------------------------------- | ---------------------------------------- | ------------------ | ------- |
| `STRIPE_SECRET_KEY`             | Stripe secret API key                    | Yes (for payments) | -       |
| `STRIPE_PUBLIC_KEY`             | Stripe publishable API key               | Yes (for payments) | -       |
| `STRIPE_WEBHOOK_SECRET`         | Stripe webhook signing secret            | Yes (for webhooks) | -       |
| `STRIPE_PRICE_ID`               | Default Stripe price ID for job listings | No                 | -       |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | Public Stripe key for client-side        | Yes (for payments) | -       |

## Notification Services

| Variable                | Description                           | Required | Default |
| ----------------------- | ------------------------------------- | -------- | ------- |
| `SLACK_WEBHOOK_URL`     | Slack webhook URL for notifications   | No       | -       |
| `DISCORD_WEBHOOK_URL`   | Discord webhook URL for notifications | No       | -       |
| `NOTIFICATION_PROVIDER` | Default notification provider         | No       | -       |

## Image Optimization

| Variable                            | Description                                   | Required | Default |
| ----------------------------------- | --------------------------------------------- | -------- | ------- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                         | No       | -       |
| `CLOUDINARY_API_KEY`                | Cloudinary API key                            | No       | -       |
| `CLOUDINARY_API_SECRET`             | Cloudinary API secret                         | No       | -       |
| `NEXT_PUBLIC_IMAGE_DOMAINS`         | Comma-separated list of allowed image domains | No       | -       |

## Rate Limiting

| Variable               | Description                           | Required | Default            |
| ---------------------- | ------------------------------------- | -------- | ------------------ |
| `RATE_LIMIT_REQUESTS`  | Number of requests allowed per window | No       | `60`               |
| `RATE_LIMIT_WINDOW_MS` | Time window in milliseconds           | No       | `60000` (1 minute) |

## Security

| Variable          | Description                                  | Required | Default |
| ----------------- | -------------------------------------------- | -------- | ------- |
| `JWT_SECRET`      | Secret for signing JWT tokens                | No       | -       |
| `CSRF_SECRET`     | Secret for CSRF protection                   | No       | -       |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | No       | -       |

## Feature Flags

| Variable                              | Description                      | Required | Default |
| ------------------------------------- | -------------------------------- | -------- | ------- |
| `NEXT_PUBLIC_ENABLE_JOB_ALERTS`       | Enable job alerts feature        | No       | `true`  |
| `NEXT_PUBLIC_ENABLE_APPLY_WITH_EMAIL` | Enable email application feature | No       | `true`  |
| `NEXT_PUBLIC_ENABLE_SALARY_FILTER`    | Enable salary filtering          | No       | `true`  |

## Advanced Configuration

| Variable               | Description                                    | Required | Default                                          |
| ---------------------- | ---------------------------------------------- | -------- | ------------------------------------------------ |
| `REVALIDATE_TIME`      | Default revalidation time for ISR in seconds   | No       | `300` (5 minutes)                                |
| `CACHE_CONTROL_HEADER` | Default Cache-Control header value             | No       | `public, max-age=60, stale-while-revalidate=300` |
| `DEBUG`                | Enable debug logging (comma-separated modules) | No       | -                                                |

## Environment-Specific Variables

### Development-Only Variables

| Variable                       | Description                             | Required | Default |
| ------------------------------ | --------------------------------------- | -------- | ------- |
| `NEXT_PUBLIC_DEV_MODE_ENABLED` | Enable development-specific features    | No       | `false` |
| `NEXT_PUBLIC_MOCK_DATA`        | Use mock data instead of real API calls | No       | `false` |

### Production-Only Variables

| Variable     | Description                   | Required | Default |
| ------------ | ----------------------------- | -------- | ------- |
| `SENTRY_DSN` | Sentry DSN for error tracking | No       | -       |
| `LOG_LEVEL`  | Logging level in production   | No       | `error` |

## Using Environment Variables in Your Code

Environment variables can be accessed in your code as follows:

### Server-Side

```typescript
// Access directly in server components or API routes
const apiKey = process.env.AIRTABLE_ACCESS_TOKEN;
```

### Client-Side

Only variables prefixed with `NEXT_PUBLIC_` are available on the client:

```typescript
// Access in client components
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
```

### In Configuration

Environment variables are often used in the configuration file:

```typescript
// config/config.ts
export const config = {
  email: {
    provider: process.env.EMAIL_PROVIDER || "encharge",
    encharge: {
      writeKey: process.env.ENCHARGE_WRITE_KEY,
    },
  },
};
```

## Best Practices

1. **Security**: Never commit sensitive environment variables to source control
2. **Naming**: Use `NEXT_PUBLIC_` prefix only for variables that must be available on the client
3. **Validation**: Validate required environment variables on startup
4. **Documentation**: Document all environment variables in your project README
5. **Defaults**: Provide sensible defaults where possible
6. **Types**: Use TypeScript to type environment variables

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**:
   - Ensure you have restarted the development server after adding variables
   - Check that `.env` or `.env.local` is in the project root
   - Verify the syntax (no spaces around the `=` sign)

2. **Client-Side Variables Undefined**:
   - Ensure they are prefixed with `NEXT_PUBLIC_`
   - Check for typos in the variable name

3. **Production Variables Not Applied**:
   - Verify they are correctly set in your hosting platform
   - Check deployment logs for environment-related errors

## Related Documentation

- [Configuration Options Reference](/docs/reference/configuration-options.md) - Reference for all configuration options
- [Deployment Guide](/docs/getting-started/deployment.md) - Guide to deploying Bordful
- [Security Best Practices](/docs/advanced/security.md) - Security recommendations 