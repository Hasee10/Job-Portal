# Job Portal

A job board (product name: **JobLo**) that aggregates listings from 20+ sources and presents them in a searchable interface, with accounts and workflows for job seekers, employers, and recruiters. A separate Procurement/RFx module (RFI/RFQ/RFP/tender workflows for vendors and buyers) runs alongside it. Job seekers browse anonymously; posting, applying, and procurement workflows require an account.

---

## What It Does

- **Aggregates jobs automatically** from APIs (Adzuna, Jooble, Remotive, Himalayas, Jobicy, RemoteOK, We Work Remotely, The Muse, Arbeitnow, Hacker News "Who's Hiring"), company-specific ATS boards (Greenhouse, Lever, Ashby), Pakistan/regional and Gulf boards (BrightSpyre, Mustakbil, MeroJob, jobs.com.pk, GulfTalent, NaukriGulf, Bayt), and browser-scraped sources (hiring.cafe, Indeed, Glassdoor, Naukri, Dice, ZipRecruiter, Levels.fyi).
- **Deduplicates and sweeps** — the sweeper continuously re-validates active job URLs and marks expired listings inactive so the board stays fresh.
- **Search and filter** — hero search by title/keyword, filters for remote/hybrid/onsite, career level, country, job type (full-time, contract, etc.), and spoken language.
- **RSS/Atom/JSON feeds** — machine-readable feeds at `/feed.xml`, `/atom.xml`, `/feed.json`.
- **SEO-ready** — JSON-LD structured data (JobPosting schema), auto-generated sitemap, dynamic OG images.
- **Job seeker accounts** — sign in with Google or LinkedIn, save jobs/searches, apply, upload a resume, and receive recruiter invites/outreach via an in-app inbox.
- **Employer accounts** — employers sign up with email/password, post and manage jobs, review applicants and candidates from a protected dashboard.
- **Recruiter accounts** — a separate email/password account type with its own dashboard, candidate pipeline, and outreach tools.
- **Procurement/RFx module** — buyers (employers) create RFI/RFQ/RFP/tender requests, invite vendors, collect responses (including sealed bids), evaluate, and award — plus a daily feed of externally scraped public tenders.
- **Email job alerts** — saved-search alert emails sent on a schedule.
- **Light/dark mode** — theme toggle with system preference detection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack in dev) |
| Language | TypeScript 5.9, Python 3.11+ |
| Styling | Tailwind CSS 3, Radix UI, lucide-react |
| Database | Supabase (PostgreSQL), accessed server-side via `@supabase/supabase-js` (REST/PostgREST) |
| Auth | NextAuth (Auth.js) v5 (beta) — Google/LinkedIn OAuth for seekers, credential-based for employers/recruiters, JWT sessions |
| Email | Gmail SMTP via `nodemailer` (welcome, password reset, job alerts, recruiter digests) |
| URL state | `nuqs` (filter/search params synced to URL) |
| Python scraper | httpx, feedparser, BeautifulSoup4, Playwright, CloakBrowser (PyPI package), Supabase REST API |
| Node.js scraper | tsx, fast-xml-parser, cheerio |
| CI/CD | GitHub Actions (cron every 12 h) |
| Hosting | Vercel |

**Note on history:** this project briefly migrated its database to CockroachDB, then reverted back to Supabase after hitting CockroachDB's free-tier RU (request unit) limits. No CockroachDB code remains in the active application — anything referencing it below is dead and has been removed.

---

## Repository Structure

```
Job-Portal/
├── bordful-main/               Next.js 15 web application (JobLo)
│   ├── app/                    App Router pages and API routes
│   │   ├── page.tsx            Home — hero, search, paginated job list
│   │   ├── jobs/               /jobs listing + /jobs/[slug] detail
│   │   ├── job-alerts/         Email subscription page
│   │   ├── account/            Job seeker account (profile, resume, inbox, saved jobs)
│   │   ├── dashboard/          Employer dashboard (auth-gated)
│   │   ├── recruiter/          Recruiter sign-in/up, dashboard, pipeline (auth-gated)
│   │   ├── procurement/        Procurement/RFx hub, requests, vendor portal, tender feed
│   │   └── api/                Auth, seeker/employer/recruiter/procurement endpoints, cron jobs
│   ├── components/             React components (auth, home, jobs, shared UI)
│   ├── lib/
│   │   ├── db/                 Supabase client + server-side query functions
│   │   ├── auth/                Job seeker / employer / recruiter credential & session logic
│   │   ├── jobs/                 Job posting, application, matching, outreach actions
│   │   ├── procurement/          RFx request/response/evaluation/audit actions
│   │   ├── content/              Career guides, masterclasses, testimonials
│   │   ├── email/               Gmail SMTP client + transactional templates
│   │   └── constants/           Career levels, countries, currencies, job types, languages
│   ├── supabase/migrations/    Tracked SQL migrations (not the full schema history — see note below)
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
│   │   └── db.py               Supabase PostgREST upsert (via `httpx`, not a DB driver)
│   └── install_task.ps1        Register Windows Task Scheduler (every 12 h, runs locally)
│
├── market-intel/               Archived: extracted second product (Pakistan e-commerce
│                                price tracking). Intentionally unwired from JobLo — not
│                                part of this application, kept for reference/spin-out.
│
└── .github/workflows/
    ├── scrape.yml              Scheduled scraper (Python + Node.js, every 12 h)
    └── secret-scan.yml         Gitleaks scan on every push / PR
```

---

## Database Schema

Supabase Postgres. Only the most recent additions are tracked as migrations under `bordful-main/supabase/migrations/` (recruiter digest, RLS fixes, procurement schema, scraped tenders) — the original core tables (`jobs`, `employers`, etc.) predate that migration folder and were created directly against the project; there is no single tracked DDL file for them.

Tables actually read/written by the application code, by domain:

| Domain | Tables |
|---|---|
| Jobs | `jobs` |
| Employers | `employers` |
| Job seekers | `job_seekers`, `seeker_profiles`, `seeker_resumes`, `saved_jobs`, `saved_searches`, `job_applications` |
| Applications | `job_application_submissions` |
| Recruiters | `recruiter_accounts`, `recruiters`, `recruiter_requests`, `candidate_outreach`, `employer_candidate_invites` |
| Procurement/RFx | `vendor_accounts`, `procurement_requests`, `procurement_invitations`, `procurement_responses`, `procurement_evaluations`, `procurement_audit_log`, `scraped_tenders` |
| Content | `career_guides`, `masterclasses`, `testimonials` |

All of the above are accessed exclusively server-side using the Supabase `service_role` key, which bypasses Row Level Security by design — RLS is enabled with no policies on these tables (deny-by-default for the public `anon`/`authenticated` roles), with app access unaffected.

---

## Environment Variables

### Web App — `bordful-main/.env.local`

| Variable | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key (server-only reads) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key — full read/write, bypasses RLS. Server-only, never expose to the client | Yes |
| `AUTH_SECRET` | NextAuth session encryption secret — generate with `openssl rand -base64 32` | Yes |
| `NEXTAUTH_URL` | Full public URL of the deployed app | Yes |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials (job seeker sign-in) | Yes |
| `AUTH_LINKEDIN_ID` / `AUTH_LINKEDIN_SECRET` | LinkedIn OAuth credentials (job seeker sign-in) | Yes |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Gmail SMTP sender account for transactional/alert email | Yes |
| `NEXT_PUBLIC_APP_URL` | Full public URL, e.g. `https://yourdomain.com` | Yes |
| `CRON_SECRET` | Bearer token required by `/api/cron/*` routes | Yes |
| `MISTRAL_API_KEY_1` / `_2` / `_3`, `MISTRAL_MODEL` | Mistral API keys (resume matching/tailoring, job-post assistant) | For AI features |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | OpenRouter fallback for the same AI features | For AI features |
| `LOGODEV_PUBLISHABLE_KEY` / `LOGODEV_SECRET_KEY` | Logo.dev — company logos | No |
| `YOUTUBE_API_KEY` | Masterclass video discovery | No |

> This list is derived from actual `process.env.*` references in the code, not from `.env.example` (which was missing most of these). `bordful-main/.env.example` only documents the Supabase + job-alert-provider variables inherited from the original open-source template; several of those (`EMAIL_PROVIDER`, `ENCHARGE_WRITE_KEY`, `AIRTABLE_*`) are template leftovers with no live code path — the app's actual email sending goes through `GMAIL_USER`/`GMAIL_APP_PASSWORD` above.

### Python Scraper — `job-scraper/.env`

| Variable | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key — full write/delete access | Yes |
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
| `COCKROACH_DATABASE_URL_CI` | **Stale name** — `.github/workflows/scrape.yml` still references this from the abandoned CockroachDB attempt. Not verified against the live GitHub Actions configuration as part of this cleanup; if the scheduled scraper job is running successfully today, this secret may actually hold a Supabase URL under a leftover name rather than evidence CockroachDB is live. |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna API credentials |
| `JOOBLE_API_KEY` | Jooble API key |
| `SCRAPER_PROXY` | Optional residential proxy |
| `CLOAKBROWSER_LICENSE_KEY` | Optional CloakBrowser license |

---

## Running Locally

### Web App

Requires: Node.js 20+ (project scripts are written for Bun, but `npm`/`npx` work identically against the same `package.json`/`package-lock.json`).

```bash
cd bordful-main

# Install dependencies
npm install
# (or: bun install, if you have Bun)

# Set up environment
cp .env.example .env.local
# Edit .env.local — fill in the variables listed above under "Web App"

# Start dev server (Turbopack, hot reload)
npm run dev

# Production build
npm run build && npm start
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
# Edit .env — fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and API keys

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

The two scrapers write to the same Supabase `public.jobs` table via idempotent upserts — overlapping runs are harmless.

```
Every 12 hours (GitHub Actions / Windows Task Scheduler)
│
├── Python scraper (job-scraper/run.py)
│   ├── API sources      — Remotive, Arbeitnow, Himalayas, Jobicy, Adzuna, Jooble,
│   │                      RemoteOK, We Work Remotely, The Muse, Hacker News, BrightSpyre,
│   │                      MeroJob, Mustakbil, ATS boards (Greenhouse/Lever/Ashby),
│   │                      GulfTalent, NaukriGulf, Bayt
│   ├── Browser sources  — hiring.cafe, Indeed, Glassdoor, Naukri, ZipRecruiter, Dice,
│   │                      Levels.fyi
│   ├── Scoring          — quality score 0–100, entry-level filter
│   └── Sweeper          — re-validates all active apply_urls; marks dead links inactive
│
└── Node.js scraper (bordful-main/scripts/scraper/index.ts)
    └── RSS sources      — Mustakbil RSS (500 jobs), jobs.com.pk
```

---

## Testing

```bash
cd bordful-main
npm run test        # Vitest — auth, procurement, and rate-limit/redirect utilities
```

Coverage is currently limited to auth, procurement response handling, and a couple of utilities — most job/application business logic is untested. The Python scraper has no automated tests.

---

## Deployment (Vercel)

1. Connect the `bordful-main/` directory as the Vercel project root (or set Root Directory to `bordful-main` in project settings).
2. Set all environment variables listed above under **Web App** in Vercel's Environment Variables panel.
3. Push to `main` — Vercel auto-deploys.

The scraper runs independently on GitHub Actions / Windows Task Scheduler and writes directly to Supabase. Vercel only needs the `SUPABASE_URL`/`SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` for server actions) to read and write the same data.

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

## Known Security Item

`leaks.md` in this repo records a historical credential-leak incident (a Supabase `service_role` key committed in `n8n-workflows/`) and its remediation checklist. As of this cleanup, the leaked files have been untracked from the git index, but **whether the key itself was rotated and whether history was purged has not been re-verified here** — see `leaks.md` for the full incident record and required owner actions. This cleanup did not touch credential handling.

---

## License

Private — all rights reserved.
