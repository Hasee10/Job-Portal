# Job Portal

A full-stack job aggregation portal that collects listings from 20+ sources and presents them in a clean, searchable interface. Employers can post jobs directly via a credential-based dashboard; job seekers browse anonymously with no account required.

---

## What It Does

- **Aggregates jobs automatically** from APIs (Adzuna, Jooble, Remotive, Himalayas, Jobicy, RemoteOK, We Work Remotely, The Muse, Arbeitnow, Hacker News "Who's Hiring"), company-specific ATS boards (Greenhouse, Lever, Ashby), Pakistan/regional boards (BrightSpyre, Mustakbil, MeroJob, jobs.com.pk), and browser-scraped sources (Indeed, Glassdoor, Naukri, Dice, ZipRecruiter, Levels.fyi, Upwork, Rozee.pk).
- **Deduplicates and sweeps** — the sweeper continuously re-validates active job URLs and marks expired listings inactive so the board stays fresh.
- **Search and filter** — hero search by title/keyword, filters for remote/hybrid/onsite, career level, country, job type (full-time, contract, etc.), and spoken language.
- **RSS/Atom/JSON feeds** — machine-readable feeds at `/feed.xml`, `/atom.xml`, `/feed.json`.
- **SEO-ready** — JSON-LD structured data (JobPosting schema), auto-generated sitemap, dynamic OG images.
- **Email job alerts** — visitors subscribe to email alerts via Encharge (or Mailchimp, SendGrid, ConvertKit).
- **Employer accounts** — employers can sign up, sign in, and access a protected dashboard. Transactional email (welcome, password reset) is sent via Resend.
- **Light/dark mode** — theme toggle with system preference detection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack in dev) |
| Language | TypeScript 5.9, Python 3.11+ |
| Styling | Tailwind CSS 3, Radix UI, lucide-react |
| Database | CockroachDB (PostgreSQL-compatible) via `pg` driver |
| Auth | NextAuth (Auth.js) v5 — credential-based, JWT sessions |
| Email | Resend (transactional), Encharge / Mailchimp / SendGrid / ConvertKit (job alerts) |
| URL state | `nuqs` (filter/search params synced to URL) |
| Python scraper | httpx, feedparser, BeautifulSoup4, Playwright, CloakBrowser, psycopg2 |
| Node.js scraper | tsx, fast-xml-parser, cheerio, pg |
| CI/CD | GitHub Actions (cron every 12 h) |
| Hosting | Vercel |

---

## Repository Structure

```
Job-Portal/
├── bordful-main/               Next.js 15 web application
│   ├── app/                    App Router pages and API routes
│   │   ├── page.tsx            Home — hero, search, paginated job list
│   │   ├── jobs/               /jobs listing + /jobs/[slug] detail
│   │   ├── job-alerts/         Email subscription page
│   │   ├── dashboard/          Employer dashboard (auth-gated)
│   │   ├── sign-in/ sign-up/   Employer credential auth
│   │   ├── forgot-password/
│   │   │   reset-password/     Password reset flow (Resend email)
│   │   └── api/                Auth endpoints, employer registration, OG images, subscribe
│   ├── components/             React components (auth, home, jobs, shared UI)
│   ├── lib/
│   │   ├── db/                 CockroachDB pool + server-side query functions
│   │   ├── auth/               Employer credential verification (bcrypt)
│   │   ├── email/              Resend client + transactional templates + alert providers
│   │   └── constants/          Career levels, countries, currencies, job types, languages
│   ├── config/                 Board configuration (title, colors, filters, hero, etc.)
│   └── scripts/scraper/        Node.js/TypeScript RSS scraper (Mustakbil, jobs.com.pk)
│
├── job-scraper/                Python scraper — primary data collection system
│   ├── run.py                  Entry point: collect → score → upsert → sweep
│   ├── jobscraper/
│   │   ├── sources/            20+ individual source scrapers
│   │   │   └── browser/        CloakBrowser/Playwright-based scrapers
│   │   ├── pipeline.py         Orchestration
│   │   ├── scoring.py          Quality score (0–100) + entry-level filter
│   │   ├── sweeper.py          Re-validates active URLs; marks dead ones inactive
│   │   ├── sanitize.py         HTML stripping, markdown normalization
│   │   └── db.py               psycopg2 upsert into CockroachDB
│   └── install_task.ps1        Register Windows Task Scheduler (every 12 h, runs locally)
│
├── cockroachdb/                Database DDL and migration scripts
│   ├── create_employers_table.sql
│   └── create_ci_scraper_user.sql
│
└── .github/workflows/
    ├── scrape.yml              Scheduled scraper (Python + Node.js, every 12 h)
    └── secret-scan.yml         Gitleaks scan on every push / PR
```

---

## Database Schema

Two tables in CockroachDB (`jobs_db`):

**`public.jobs`** — scraped job listings  
Key columns: `id`, `title`, `company`, `apply_url` (unique), `source`, `job_identifier`, `description`, `type`, `remote_type`, `workplace_city`, `workplace_country`, `salary_min`, `salary_max`, `salary_currency`, `salary_unit`, `posted_at`, `valid_through`, `is_active`, `featured`, `career_level`, `visa_sponsorship`, `languages`, `remote_region`

**`public.employers`** — employer accounts  
Key columns: `id`, `email` (unique), `password_hash`, `company_name`, `created_at`, `reset_token`, `reset_token_expires_at`

---

## Environment Variables

### Web App — `bordful-main/.env.local`

| Variable | Description | Required |
|---|---|---|
| `COCKROACH_DATABASE_URL` | CockroachDB connection string (read-only on `jobs`, read-write on `employers`) | Yes |
| `AUTH_SECRET` | NextAuth JWT secret — generate with `openssl rand -base64 32` | Yes |
| `RESEND_API_KEY` | Resend API key for transactional email | Yes |
| `NEXT_PUBLIC_APP_URL` | Full public URL, e.g. `https://yourdomain.com` | Yes |
| `EMAIL_PROVIDER` | Job alert provider: `encharge`, `mailchimp`, `convertkit`, `sendgrid` | No |
| `ENCHARGE_WRITE_KEY` | Encharge write key | If using Encharge |
| `MAILCHIMP_API_KEY` / `MAILCHIMP_SERVER_PREFIX` / `MAILCHIMP_LIST_ID` | Mailchimp credentials | If using Mailchimp |
| `SENDGRID_API_KEY` / `SENDGRID_LIST_IDS` | SendGrid credentials | If using SendGrid |
| `COCKROACH_WRITER_URL` | Writer credential for the Node.js scraper (local use only) | No |

> **Note:** CockroachDB passwords containing `$` must be escaped as `\$` in `.env.local` because Next.js runs dotenv-expand on it.

### Python Scraper — `job-scraper/.env`

| Variable | Description | Required |
|---|---|---|
| `COCKROACH_DATABASE_URL` | CockroachDB connection string (full write + delete access) | Yes |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna free API credentials — [developer.adzuna.com](https://developer.adzuna.com/) | For Adzuna |
| `JOOBLE_API_KEY` | Jooble free API key — [jooble.org/api/about](https://jooble.org/api/about) | For Jooble |
| `CLOAKBROWSER_LICENSE_KEY` | CloakBrowser Pro key — required for WAF-protected browser sources | No |
| `SCRAPER_PROXY` | Residential proxy URL (`http://user:pass@host:port`) for Indeed/Glassdoor | No |
| `SKIP_SOURCES` | Comma-separated sources to skip, e.g. `upwork,rozee` | No |
| `RETENTION_DAYS` | Days before discontinued jobs are hard-deleted (default: `90`) | No |
| `ATS_EXTRA_BOARDS` | Extra Greenhouse/Lever/Ashby board tokens beyond `companies.json` | No |

### GitHub Actions Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|---|---|
| `COCKROACH_DATABASE_URL_CI` | CockroachDB connection string for CI (INSERT/UPDATE only, no DELETE — see `cockroachdb/create_ci_scraper_user.sql`) |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna API credentials |
| `JOOBLE_API_KEY` | Jooble API key |
| `SCRAPER_PROXY` | Optional residential proxy |
| `CLOAKBROWSER_LICENSE_KEY` | Optional CloakBrowser license |

---

## Running Locally

### Web App

Requires: Bun (or Node.js 20+), a CockroachDB cluster.

```bash
cd bordful-main

# Install dependencies
bun install

# Set up environment
cp .env.example .env.local
# Edit .env.local — fill in COCKROACH_DATABASE_URL, AUTH_SECRET, RESEND_API_KEY, NEXT_PUBLIC_APP_URL

# Start dev server (Turbopack, hot reload)
bun dev

# Production build
bun run build && bun start
```

### Node.js Scraper

```bash
cd bordful-main

# Run all RSS sources
npx tsx scripts/scraper/index.ts rss

# Run a specific source
npx tsx scripts/scraper/index.ts mustakbil
npx tsx scripts/scraper/index.ts naukrigulf
```

Credentials are loaded from `../job-scraper/.env` first (writer credential), then `.env.local` as fallback.

### Python Scraper

Requires: Python 3.11+.

```bash
cd job-scraper

# Install dependencies
pip install -r requirements.txt
python -m playwright install --with-deps chromium
python -m cloakbrowser install   # optional, for WAF-protected sources

# Set up environment
copy .env.example .env   # Windows
cp .env.example .env     # macOS/Linux
# Edit .env — fill in COCKROACH_DATABASE_URL and API keys

# Run once
python run.py

# Run without browser sources (faster, no Playwright needed)
python run.py --no-browser

# Sweep only (re-validate existing URLs, no new collection)
python run.py --sweep-only

# Schedule via Windows Task Scheduler (every 12 hours)
.\install_task.ps1
```

---

## Scraper Architecture

The two scrapers write to the same `public.jobs` table via idempotent upserts — overlapping runs are harmless.

```
Every 12 hours (GitHub Actions / Windows Task Scheduler)
│
├── Python scraper (job-scraper/run.py)
│   ├── API sources      — Remotive, Arbeitnow, Himalayas, Jobicy, Adzuna, Jooble,
│   │                      RemoteOK, We Work Remotely, The Muse, Hacker News, BrightSpyre,
│   │                      MeroJob, Mustakbil, ATS boards (Greenhouse/Lever/Ashby)
│   ├── Browser sources  — hiring.cafe, Indeed, Glassdoor, Naukri, ZipRecruiter, Dice,
│   │                      Levels.fyi, Upwork*, Rozee.pk*   (* skipped in CI)
│   ├── Scoring          — quality score 0–100, entry-level filter
│   └── Sweeper          — re-validates all active apply_urls; marks dead links inactive
│
└── Node.js scraper (bordful-main/scripts/scraper/index.ts)
    └── RSS sources      — Mustakbil RSS (500 jobs), jobs.com.pk
```

---

## Deployment (Vercel)

1. Connect the `bordful-main/` directory as the Vercel project root (or set Root Directory to `bordful-main` in project settings).
2. Set all environment variables listed above under **Web App** in Vercel's Environment Variables panel.
3. Push to `main` — Vercel auto-deploys.

The scraper runs independently on GitHub Actions and writes directly to CockroachDB. Vercel only needs read access to the database.

---

## GitHub Actions — Will going private break the cron schedule?

**No — making the repo private does not affect how cron jobs run.** GitHub Actions scheduled workflows (`on: schedule`) work identically on private and public repositories.

The only practical difference is **billing**:

| | Public repo | Private repo |
|---|---|---|
| Actions minutes | Unlimited (free) | 2,000 minutes/month on the free plan |
| Current usage | ~15 min per run × 2 runs/day × 30 days | ≈ **900 minutes/month** |
| Free plan headroom | — | ≈ 1,100 minutes remaining |

The current scraper runs in about 12–15 minutes per execution. At twice daily that is roughly **900 minutes/month** — comfortably within the free plan's 2,000-minute allowance. If you add more sources and runtime grows, upgrading to GitHub Pro ($4/month, 3,000 minutes) would cover it.

One additional note: GitHub will **disable scheduled workflows on inactive repos** (no pushes for 60 days). As long as you push code regularly that timer resets automatically. If the repo goes quiet, you can re-enable workflows manually from the Actions tab.

---

## License

Private — all rights reserved.
