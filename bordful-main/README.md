# Joblo: Job Board Powered by Next.js, Supabase & n8n

Joblo is a modern, minimal job board built with Next.js, Tailwind CSS, and Supabase. Job
listings aren't entered by hand — a set of [n8n](https://n8n.io) workflows (in the sibling
[`n8n-workflows/`](../n8n-workflows/README.md) directory) automatically scrapes, normalizes,
scores, and upserts postings from 9 external job sources into a Supabase `jobs` table every
6 hours. This portal reads that table and renders it as a searchable, filterable job board.

Joblo started life as [Bordful](https://github.com/craftled/bordful), an open-source Next.js
job board template originally built on Airtable. The frontend, theming system, and SEO
tooling are still Bordful's — the data layer has been swapped for Supabase, and the
collection pipeline (n8n) is new.

## Architecture

```
n8n-workflows/                         bordful-main/ (this app)
┌─────────────────────────┐            ┌──────────────────────────┐
│ 01-job-collector          │            │ Next.js (App Router)     │
│  9 sources → normalize →  │  writes    │  getJobs() / getJob(id)  │
│  score → upsert           │ ─────────► │  reads via Supabase      │
│                            │  Supabase  │  anon key (server-only)  │
│ 07-stale-job-sweeper       │  `jobs`    │                          │
│  polls apply_url, marks    │  table     │  Home, Jobs, job detail, │
│  dead postings inactive    │            │  RSS/Atom/JSON feeds,    │
│                            │            │  sitemap, OG images      │
│ 06-daily-sheet-export      │            │                          │
│  (admin reporting only,    │            │                          │
│  not read by the portal)   │            │                          │
└─────────────────────────┘            └──────────────────────────┘
```

- **n8n writes** with the Supabase `service_role` key (bypasses Row Level Security).
- **The portal reads** with the Supabase `anon` key, so a public read policy (RLS) must
  exist on the `jobs` table, or every page will silently render zero jobs.
- The portal never talks to n8n directly and has no admin UI of its own — all job data
  management happens through the n8n workflows and the Supabase table.

See [`n8n-workflows/README.md`](../n8n-workflows/README.md) for the full collector
pipeline, migrations, and verification checklist.

## What You Get

- Job listings with search, filters (type, career level, location, language), and sorting
- Automatic employment type, salary, remote region, and career-level enrichment from raw
  scraped data (see `Derive Portal Fields` in the collector workflow)
- Automatic staleness detection — dead `apply_url`s get marked inactive and drop off the
  site on their own
- Mobile-responsive design, SEO-optimized (schema.org JobPosting, sitemap, robots.txt)
- RSS, Atom, and JSON feeds
- Job alert email subscriptions (Encharge by default)
- Security headers (CSP, HSTS, X-Frame-Options, etc.) and XSS-hardened rendering of
  externally-scraped job data (see [Security](#security) below)

**Live dev server:** once running, visit [http://localhost:3000](http://localhost:3000)

## Getting Started

### Prerequisites

- **Node.js 18+** (or [Bun](https://bun.sh) — `package.json` scripts assume Bun, but
  everything works with plain `npm`/`npx` too; that's what these instructions use)
- A **Supabase project** — either your own, or the one already wired up for this
  deployment (ask whoever set up the n8n workflows for the project URL and anon key)
- (Optional, only if you're changing what jobs get collected) An **n8n instance** — see
  [`n8n-workflows/README.md`](../n8n-workflows/README.md)

### Step 1: Install dependencies

```bash
cd bordful-main
npm install
```

### Step 2: Set up the Supabase database

If the Supabase project doesn't already have the `jobs` table:

1. In the Supabase SQL editor, run every file in
   [`n8n-workflows/migrations/`](../n8n-workflows/migrations/) in numeric order
   (`001` → `006`). Each is additive (`add column if not exists`), so it's safe to re-run.
2. Add a public read policy so the portal's `anon` key can actually see rows:
   ```sql
   alter table public.jobs enable row level security;

   create policy "Public can read jobs"
     on public.jobs for select
     using (true);
   ```
   (n8n writes with the `service_role` key, which bypasses RLS — this policy only affects
   the portal's read path.)

### Step 3: Get job data flowing (n8n)

If jobs aren't being collected yet, import and activate the workflows described in
[`n8n-workflows/README.md`](../n8n-workflows/README.md):

- `01-job-collector.json` — scrapes 9 sources every 6 hours, enriches, scores, upserts
- `07-stale-job-sweeper.json` — every 3 hours, marks dead postings inactive
- `06-daily-sheet-export.json` — optional admin-only Google Sheets digest, not required
  for the portal to work

**Workflows import with their schedule trigger turned off.** After importing each one,
flip the **Active** toggle in the n8n editor, or it will only ever run when you manually
click "Execute workflow."

### Step 4: Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase (job data source) — read with the anon/public key, never service_role
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Site URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: job alert emails
EMAIL_PROVIDER=encharge
ENCHARGE_WRITE_KEY=your_encharge_write_key_here
```

> ⚠️ Never commit `.env.local` or share it — it's already excluded via `.gitignore`.
> Without `SUPABASE_URL`/`SUPABASE_ANON_KEY` set, the app still runs, it just renders zero
> jobs (the data layer fails gracefully rather than crashing).

### Step 5: Run the dev server

```bash
npx next dev -p 3000
```

Visit [http://localhost:3000](http://localhost:3000). If Supabase is wired up correctly and
n8n has run at least once, you should see real job listings with salary, location, and
type populated.

**Not seeing jobs?**
- Confirm the RLS policy from Step 2 exists — a missing policy is the most common cause of
  an empty site with valid credentials.
- Confirm at least one n8n workflow run has completed and the `jobs` table has rows with
  `is_active = true`.
- Check the browser network tab / server logs for Supabase request failures.

## Security

This site renders job data scraped from 9 external, untrusted sources, which shapes a few
deliberate hardening choices:

- **JSON-LD injection guard** (`lib/utils/json-ld.ts`) — every `<script type="application/
  ld+json">` schema.org block is serialized through `safeJsonLdStringify`, which escapes
  `<` so a scraped job title containing `</script>` can't break out of the tag.
- **`apply_url` scheme allowlist** (`lib/db/airtable.server.ts`) — only `http:`/`https:`
  URLs are ever rendered as a clickable link; anything else (e.g. a `javascript:` URI from
  a malicious listing) is dropped to an empty string.
- **No raw HTML in markdown** — job descriptions render through `react-markdown` without
  `rehype-raw`, so embedded HTML tags are escaped, not executed.
- **Security headers** (`next.config.ts`) — `Content-Security-Policy`, `X-Frame-Options`,
  `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, and
  `Permissions-Policy` are set on every route.
- **`service_role` vs `anon`** — the portal only ever holds the `anon` key. The
  `service_role` key lives only in the n8n workflow JSON files, which are excluded from
  git via `.gitignore`.

## Branding

The site is branded **Joblo**, with a custom logo (`public/joblo.svg` / `joblo-light.svg`)
in the site config at `config/config.example.ts`. Social links (GitHub, LinkedIn, X,
Bluesky, Reddit) are currently disabled (`show: false`) in the nav config — set `show: true`
and add a URL under `config.nav.<platform>` when you're ready to link real accounts.

## Pricing

Configured in `config/config.example.ts` (`pricing.plans`):

| Plan | Price | Billing |
|---|---|---|
| Free | Free | forever |
| Pro | $19 | per job posting |
| Business | $149 | per year |

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon/public API key (read-only, safe for server-side use — never the `service_role` key) |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Your site's public URL |
| `EMAIL_PROVIDER` | No | Email service for job alerts. Only `encharge` is implemented today — any other value throws a clear error rather than silently misrouting subscriptions |
| `ENCHARGE_WRITE_KEY` | No | Required if `EMAIL_PROVIDER=encharge` and job alerts are enabled |
| `AIRTABLE_ACCESS_TOKEN` / `AIRTABLE_BASE_ID` / `AIRTABLE_TABLE_NAME` | No | Deprecated — no longer read by the app; kept in `.env.example` only for historical reference |

For the full list including feature-specific overrides, see
[Environment Variables Guide](/docs/reference/environment-variables.md) (note: that doc
still reflects the original Airtable-based template in places — the table above is the
accurate, current version for this deployment).

## Dive Deeper: Features & Documentation

- **n8n collection pipeline:** [`n8n-workflows/README.md`](../n8n-workflows/README.md) —
  sources, field scoring, migrations, verification checklist
- **Core Functionality & Guides:** ([Features](/docs/guides/features.md), [All Guides](/docs/guides/index.md))
- **Customization:** ([Customization Guide](/docs/guides/customization.md), [Theming](/docs/guides/theming-customization.md), [Hero Section](/docs/guides/hero-section.md), [Navigation](/docs/guides/navigation.md), [Footer](/docs/guides/footer.md))
- **SEO & Content:** ([Schema Implementation](/docs/advanced/schema-implementation.md), [Sitemaps](/docs/reference/sitemap-generation.md), [Robots.txt](/docs/reference/robots-generation.md), [RSS Feeds](/docs/reference/rss-feed-system.md), [FAQ System](/docs/reference/faq-system.md))
- **Advanced Topics:** ([Script Management](/docs/advanced/script-management.md), [Email Integration](/docs/guides/email-integration.md), [Salary Structure](/docs/reference/salary-structure.md), [Language Support](/docs/reference/language-system.md))

> Note: most of `/docs` documents the original Bordful/Airtable template and hasn't been
> rewritten for the Supabase + n8n data pipeline. Treat it as accurate for anything
> unrelated to *where job data comes from* (theming, SEO, feeds, filtering, etc.) and defer
> to this README and `n8n-workflows/README.md` for data-source specifics.

For a full overview of all documentation, visit the [Documentation Hub](/docs/README.md).

## Project Structure

```
app/
  layout.tsx              # Root layout with configurable fonts (Geist, Inter, IBM Plex Serif)
  page.tsx                # Home page with job listings
  globals.css             # Global styles
  sitemap.ts              # Dynamic sitemap generation
  robots.ts               # Dynamic robots.txt generation
  not-found.tsx           # 404 page
  favicon.ico             # Favicon route handler
  jobs/
    [slug]/page.tsx        # Individual job page (SEO-friendly URLs)
    language/[language]/   # Language-filtered job listings
    level/[level]/         # Experience level filtered listings
    location/[location]/   # Location-filtered job listings
    type/[type]/           # Job type filtered listings
    page.tsx               # Main jobs directory (category browse) page
    not-found.tsx          # Jobs-specific 404 page
  api/
    subscribe/route.ts      # Job alerts subscription endpoint (rate-limited)
    og/route.tsx            # General Open Graph image generation
    og/jobs/[slug]/route.tsx # Individual job OG image generation
  about/, contact/, faq/, pricing/, job-alerts/, changelog/, terms/, privacy/
  feed.xml/, atom.xml/, feed.json/   # RSS/Atom/JSON feed routes (feed-utils.ts)

lib/
  db/
    airtable.ts             # Job/Salary types + formatting helpers (name is historical)
    airtable.server.ts      # Supabase data layer: getJobs()/getJob()/testConnection()
                             # (reads via PostgREST with the anon key; despite the
                             # filename, this is the Supabase integration, not Airtable)
  utils/
    json-ld.ts              # XSS-safe JSON-LD serialization for schema.org scripts
    formatDate.ts, markdown.ts, metadata.ts, slugify.ts, colors.ts, fonts.ts, filter-jobs.ts
    feed-utils.ts, og-config.ts, og-job-helpers.tsx, font-utils.ts, image-utils.ts
    job-validation.ts       # slug → job lookup for OG image + metadata routes
  email/
    index.ts                # Selects the configured provider (EMAIL_PROVIDER); throws
                             # clearly if an unimplemented provider is chosen
    types.ts, providers/encharge.ts

components/
  ui/                       # nav, footer, breadcrumb, schema (JobPosting/FAQ/About/
                             # Contact/Website), hero section, job badges, etc.
  jobs/                     # JobCard, JobCardList, CompactJobCard, JobListings
  home/, contact/, job-alerts/, analytics/, server/

config/
  config.example.ts         # The actual live configuration (site title, nav, footer,
                             # pricing, FAQ copy, OG images, email provider, etc.)
  config.ts                 # Empty override — merges on top of config.example.ts
  index.ts                  # Merges config.ts over config.example.ts

n8n-workflows/               # Sibling directory (outside bordful-main) — see its own README
  migrations/                # SQL migrations for the Supabase `jobs` table (001-006)
  workflows/                 # n8n workflow JSON exports (excluded from git — contain
                              # live Supabase service_role + source API keys)

public/
  joblo.svg, joblo-light.svg # Site logo (nav / footer)
  assets/social/              # Social icon assets (icons currently disabled in nav)
```

## Salary Structure

Joblo includes a sophisticated salary handling system with multiple currencies and formats:

- Support for 50+ global currencies and cryptocurrencies with proper symbols (₿, Ξ)
- Smart currency display with intelligent spacing based on currency type
- Consistent and readable salary ranges with compact formatting (e.g., "$50k - $75k")
- Multiple time units (hour, day, week, month, year, project)
- Salary is populated automatically for scraped jobs where the source provides it, or
  parsed from the description text as a best-effort fallback (see the collector's
  `Derive Portal Fields` step) — it's not entered manually

For detailed documentation on the salary structure, see [Salary Structure](/docs/reference/salary-structure.md).

## Pagination, Sorting, and URL Parameters

- URL-based pagination for better UX and SEO
- Configurable items per page (5, 10, 25, 50, 100)
- Multiple sorting options (newest, oldest, salary)
- Comprehensive URL parameter system for all filters and settings

For detailed documentation, see [Pagination, Sorting, and URL Parameters](/docs/reference/pagination-sorting.md).

## Sitemap & Robots.txt

Both are generated dynamically via Next.js's Metadata API (`app/sitemap.ts`,
`app/robots.ts`), revalidating every 5 minutes so newly-collected jobs show up without a
rebuild. See [Sitemap Generation](/docs/reference/sitemap-generation.md) and
[Robots.txt Generation](/docs/reference/robots-generation.md).

## RSS Feed System

- RSS 2.0 (`/feed.xml`), Atom (`/atom.xml`), and JSON Feed (`/feed.json`)
- Rich job content with configurable preview length
- Auto-discovery links for feed readers, navigation and footer integration

For detailed documentation, see [RSS Feed System](/docs/reference/rss-feed-system.md).

## Email Provider Integration

- Server-side, rate-limited API route (`/api/subscribe`) for job alert subscriptions
- Provider selection via `EMAIL_PROVIDER` / `config.email.provider` — **only `encharge` is
  implemented today**; selecting anything else throws a clear configuration error instead
  of silently falling back
- To add a new provider: implement `lib/email/providers/<name>.ts` against the
  `EmailProvider` interface in `lib/email/types.ts`, then add it to the switch in
  `lib/email/index.ts`

For more, see [Email Provider Integration](/docs/guides/email-integration.md).

## Customization

Key customization options:

- **Styling**: Tailwind CSS theme, global styles, component-specific styling
- **Script Management**: analytics/tracking scripts with optimized loading strategies
- **Data Source**: the Supabase integration lives entirely in `lib/db/airtable.server.ts` —
  swap it out if you want a different backend, or feed the `jobs` table from something
  other than the bundled n8n workflows
- **Theme Customization**: colors, typography, design tokens via `config/config.example.ts`
- **Component Customization**: modify specific components to match your requirements

For comprehensive customization documentation, see our [Customization Guide](/docs/guides/customization.md).

## Deployment

Recommended: Vercel (best Next.js support).

1. **Build locally first** to catch issues before deploying:
   ```bash
   npx next build
   ```
2. Push to GitHub (`.env.local` is already gitignored) and import the repo in Vercel.
3. In Vercel → Settings → Environment Variables, add:
   ```
   SUPABASE_URL = https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY = your_supabase_anon_key
   NEXT_PUBLIC_APP_URL = https://your-domain.vercel.app
   EMAIL_PROVIDER = encharge
   ENCHARGE_WRITE_KEY = your_encharge_write_key
   ```
4. Deploy.

n8n and Supabase are independent of this deployment step — the portal will start rendering
real jobs as soon as its Supabase credentials are valid and the `jobs` table has active
rows, regardless of where/when n8n runs.

For platform-specific guides (Vercel, Netlify, Docker), see our [Deployment Guide](/docs/getting-started/deployment.md) (Airtable references in that doc are outdated; use the environment variables above instead).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this for your own job board! 100% free for personal and commercial use.

## Credits

Frontend originally built by [Craftled](https://craftled.com) as
[Bordful](https://github.com/craftled/bordful); adapted here to run on Supabase with an
n8n-based collection pipeline.
