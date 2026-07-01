---
title: Airtable Setup Guide
description: Comprehensive guide to setting up and configuring Airtable as the backend database for your Bordful job board.
lastUpdated: "2025-05-22"
---

# Airtable Setup Guide

Bordful uses [Airtable](https://airtable.com/invite/r/y2hcMqpl) as its backend database. This guide provides detailed instructions for setting up and configuring your Airtable base to work seamlessly with Bordful.

## Why Airtable?

Airtable offers several advantages as a backend for your job board:

- **No-code interface** for managing job listings
- **Rich text formatting** support for job descriptions
- **Collaborative editing** for team management
- **API access** for programmatic integration
- **Free tier** available for small job boards
- **Advanced views** for filtering and sorting job listings
- **Automation capabilities** for workflow enhancement

## Setup Options

You have two options for setting up your Airtable base:

### Option 1: Quick Setup with Template (Recommended)

This is the fastest way to get started with the correct structure and sample data:

1. Visit the Bordful Airtable template: [https://airtable.com/appLx3b8wF3cyfoMd/shrWo1VUVq7mJS6CB](https://airtable.com/appLx3b8wF3cyfoMd/shrWo1VUVq7mJS6CB)

2. Click "Use this data" in the top right corner:
   ![Airtable Use This Data Button](../../public/docs/images/airtable-use-data.png)

3. Name your base (e.g., "Bordful Job Board"):
   ![Name Your Airtable Base](../../public/docs/images/airtable-name-base.png)

4. Click "Create base" to create your copy of the template

This will create a fully configured Airtable base with:
- All required fields properly configured
- Sample job listings to help you understand the data structure
- Correct field types and options for all fields
- Pre-configured views for managing your job listings

### Option 2: Manual Setup

If you prefer to set up your Airtable base from scratch or need to customize the structure:

1. **Create a new Airtable base**:
   - Go to [airtable.com](https://airtable.com/invite/r/y2hcMqpl) and sign in
   - Click "Add a base" → "Start from scratch"
   - Name your base (e.g., "Bordful Job Board")

2. **Rename the default table** to "Jobs" (or your preferred name):
   - Click on "Table 1" tab
   - Click the dropdown arrow next to "Table 1"
   - Select "Rename table"
   - Enter "Jobs"

3. **Set up the required fields** by clicking the "+" icon in the table header:

#### Core Fields (Required)

| Field Name        | Field Type       | Options/Configuration                                                                                                                                                                             |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| title             | Single line text | Job title                                                                                                                                                                                         |
| company           | Single line text | Company name                                                                                                                                                                                      |
| type              | Single select    | Options: Full-time, Part-time, Contract, Freelance                                                                                                                                                |
| salary_min        | Number           | Minimum salary amount                                                                                                                                                                             |
| salary_max        | Number           | Maximum salary amount                                                                                                                                                                             |
| salary_currency   | Single select    | Options: USD, EUR, GBP, etc. (see Currency section below)                                                                                                                                         |
| salary_unit       | Single select    | Options: hour, day, week, month, year, project                                                                                                                                                    |
| description       | Long text        | Enable rich text formatting                                                                                                                                                                       |
| apply_url         | URL              | Direct link to application page                                                                                                                                                                   |
| posted_date       | Date             | When the job was posted                                                                                                                                                                           |
| status            | Single select    | Options: active, inactive                                                                                                                                                                         |
| career_level      | Multiple select  | Options: Internship, Entry Level, Associate, Junior, Mid Level, Senior, Staff, Principal, Lead, Manager, Senior Manager, Director, Senior Director, VP, SVP, EVP, C-Level, Founder, Not Specified |
| workplace_type    | Single select    | Options: On-site, Hybrid, Remote, Not specified                                                                                                                                                   |
| workplace_city    | Single line text | City location for the job                                                                                                                                                                         |
| workplace_country | Single select    | Options: Use ISO 3166 country names                                                                                                                                                               |
| featured          | Checkbox         | Featured jobs appear highlighted                                                                                                                                                                  |

#### Additional Fields (Recommended)

| Field Name               | Field Type       | Options/Configuration                                                                                           |
| ------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| benefits                 | Long text        | Job benefits (plain text, recommended format: "• Benefit 1\n• Benefit 2\n• Benefit 3")                          |
| application_requirements | Long text        | Requirements for application (plain text, comma-separated)                                                      |
| valid_through            | Date             | Application deadline date                                                                                       |
| job_identifier           | Single line text | Unique identifier/reference code for the job                                                                    |
| job_source_name          | Single line text | Name of the job source platform (e.g., "LinkedIn Jobs", "Workable", "Figma Careers")                            |
| remote_region            | Single select    | Options: Worldwide, Americas Only, Europe Only, Asia-Pacific Only, US Only, EU Only, UK/EU Only, US/Canada Only |
| timezone_requirements    | Single line text | Required timezone for remote jobs                                                                               |
| visa_sponsorship         | Single select    | Options: Yes, No, Not specified                                                                                 |
| languages                | Multiple select  | Format: "Language Name (code)" - e.g., "English (en)", "Spanish (es)", "French (fr)"                            |

#### Schema.org SEO Fields (Optional but Recommended)

These fields enhance the structured data for better SEO and Google Jobs integration:

| Field Name              | Field Type       | Options/Configuration                                                    |
| ----------------------- | ---------------- | ------------------------------------------------------------------------ |
| skills                  | Long text        | Skills required for the position                                         |
| qualifications          | Long text        | Specific qualifications needed                                           |
| education_requirements  | Long text        | Educational background needed                                            |
| experience_requirements | Long text        | Experience needed for the position                                       |
| responsibilities        | Long text        | Key responsibilities of the role                                         |
| industry                | Single line text | Industry associated with the job                                         |
| occupational_category   | Single line text | Preferably using O*NET-SOC codes, e.g., "15-1252.00 Software Developers" |

## Field Configuration Details

### Currency Setup

For the `salary_currency` field, you should include all currencies you want to support. The recommended format for options is:

- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- JPY (Japanese Yen)
- etc.

For cryptocurrencies:
- BTC (Bitcoin)
- ETH (Ethereum)
- USDT (Tether)
- USDC (USD Coin)

### Languages Setup

For the `languages` field, configure the Multiple Select options with language names and their ISO 639-1 codes in parentheses:

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Japanese (ja)
- etc.

This format allows Bordful to both display the human-readable language names and use the standardized codes for technical operations.

### Rich Text in Descriptions

The `description` field should have rich text formatting enabled:

1. Create the field as "Long text"
2. Click the field's dropdown arrow
3. Select "Customize field"
4. Toggle on "Long text formatting"
5. Choose "Rich text formatting" (not Markdown)

This allows job descriptions to include formatting like bold, italic, bulleted lists, and links.

## Airtable API Setup

After setting up your base structure, you need to create API credentials for Bordful to access your data:

1. **Create a Personal Access Token**:
   - Go to [https://airtable.com/create/tokens](https://airtable.com/create/tokens)
   - Give your token a descriptive name (e.g., "Bordful Integration")
   - Set an expiration date or choose "No expiration" (for production)
   
2. **Configure token scopes** (select at minimum):
   - `data.records:read` - Allows reading records
   - `schema.bases:read` - Allows reading base schema

3. **Add your base to the token's access list**:
   - In the "Add a base" dropdown, find and select your Bordful base
   - Configure access as "All tables"
   
4. **Create the token** and securely copy the token value
   - ⚠️ **IMPORTANT:** This is the only time you'll see the token value. Store it securely.

5. **Get your Base ID**:
   - Open your Airtable base
   - In the URL, find the part that looks like `airtable.com/appXXXXXXXXXXXXX`
   - The Base ID is the `appXXXXXXXXXXXXX` portion

## Environment Variables Setup

With your Airtable base configured and API credentials in hand, set up the environment variables in your Bordful project:

1. Create a `.env.local` file in your Bordful project root
2. Add the following variables:

```
AIRTABLE_ACCESS_TOKEN=your_token_here
AIRTABLE_BASE_ID=your_base_id_here
AIRTABLE_TABLE_NAME=Jobs  # Or your custom table name if you used something different
```

## Adding and Managing Job Listings

### Creating New Job Listings

To add a new job listing:

1. Open your Airtable base
2. Navigate to the Jobs table
3. Click the "+" button in the first empty row
4. Fill in all required fields
5. Ensure the `status` field is set to "active" for the job to appear on your site

### Managing Existing Jobs

To update or manage existing jobs:

1. Navigate to the job record in Airtable
2. Edit any fields as needed
3. To temporarily hide a job, change its `status` to "inactive"
4. To feature a job, check the `featured` checkbox

## Best Practices

### Organizing Your Airtable Base

For easier job management:

1. **Create custom views** for different job states:
   - Active Jobs (Filter: status = "active")
   - Featured Jobs (Filter: featured = TRUE)
   - Expired Jobs (Filter: valid_through < TODAY())
   - Draft Jobs (Filter: status = "inactive")

2. **Use Airtable's color coding** for visual organization:
   - Highlight featured jobs
   - Color-code by job type or department
   - Mark jobs with upcoming deadlines

### Data Entry Tips

1. **Rich Text Formatting**: For job descriptions, use formatting to improve readability:
   - Section headers as Bold text
   - Bullet points for responsibilities and requirements
   - Numbered lists for step-by-step processes

2. **Consistent Currency Format**: Always include both the currency code and value (e.g., use both `salary_currency` and `salary_min`/`salary_max`)

3. **Benefits Formatting**: Use bullet points for benefits for better readability:
   ```
   • Competitive health insurance
   • Flexible work hours
   • 401(k) matching
   • Professional development budget
   ```

## Troubleshooting

### Common Issues

**Jobs not appearing on your site:**
- Check that the job's `status` is set to "active"
- Verify your AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID are correct
- Ensure your token has the correct permissions and access to the base

**Rich text not rendering correctly:**
- Confirm the `description` field has rich text formatting enabled
- Avoid using complex formatting features not supported by Airtable

**API rate limiting issues:**
- Airtable has rate limits for API requests (typically 5 requests/second)
- Implement caching in your application to reduce API calls

## Next Steps

After setting up your Airtable base:

1. [Configure your Bordful site](/docs/getting-started/configuration.md)
2. [Customize the appearance](/docs/guides/customization.md)
3. [Deploy your job board](/docs/getting-started/deployment.md)

## Related Documentation

- [Installation Guide](/docs/getting-started/installation.md)
- [Configuration Guide](/docs/getting-started/configuration.md)
- [Schema.org Implementation](/docs/advanced/schema-implementation.md)
- [Deployment Guide](/docs/getting-started/deployment.md) 