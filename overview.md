# Market Intel Tool — Product & Integration Overview

**Purpose of this document:** ground a design/layout pass (homepage, navigation, sign-in/sign-up routing) for a second product being added alongside the existing JobLo job portal. This is a planning document, not an implementation spec — no code has been written yet. Sections marked **DECISION NEEDED** are open questions the layout/design pass should resolve or push back on before build starts.

---

## 1. What already exists (context for the new product)

### 1.1 Elevator pitch

**JobLo** is a job board that aggregates job listings from multiple external sources (RSS feeds, Mustakbil, NaukriGulf) and layers three kinds of first-party accounts on top: job seekers who search/save/apply, employers who post and manage their own listings, and recruiters who source candidates independently of any specific job. It monetizes (in principle — see 1.5) by charging employers for visibility rather than gatekeeping listings, and it uses AI to parse resumes and match people to jobs rather than relying on keyword search alone.

### 1.2 Job board core

- **Aggregated + first-party listings.** Most jobs on the board come from scrapers; employers and recruiters can also post directly. All listings share one `jobs` table and one public detail page regardless of source.
- **Search & discovery.** Filtering by job type, career level, workplace type (remote/hybrid/on-site), location, language, salary range; dedicated browsable pages for job types, locations, career levels, and languages (`/jobs`, plus faceted routes).
- **Syndication.** RSS (`/feed.xml`), Atom (`/atom.xml`), and JSON Feed (`/feed.json`) outputs, plus a sitemap — the board is built to be crawled/subscribed to, not just browsed.
- **Content/SEO layer around the board:**
  - `/guides` — long-form career/hiring content (AI-assisted generation, per a cron job seen in the codebase: `generate-guides`).
  - `/masterclasses` — video sessions with hiring experts on job searching and interviewing, discovered/curated via another scheduled job (`discover-masterclasses`).
  - `/changelog`, `/faq`, `/about`, `/contact`, `/privacy`, `/terms` — standard supporting pages.

### 1.3 The three account types

| Role | What they do | Entry point | Sign-in method |
|---|---|---|---|
| **Job seeker** | Browse/save/apply to jobs, build or upload a resume, get an AI-parsed skill profile, save searches with alert emails, opt in to being discovered by recruiters, manage an inbox of recruiter/employer outreach | `/account/sign-in` | Google/LinkedIn OAuth (no password — account is created on first login) |
| **Employer** | Post jobs (in-app or external apply link), review applications, auto+manual shortlist based on required skills, search candidates scoped to one of their own job postings, maintain a company profile with an auto-detected logo | `/sign-in`, `/sign-up` | Email + password |
| **Recruiter** | Everything an employer can do (job posting, applications, shortlisting — the two roles share the same underlying job-posting infrastructure) *plus* general candidate discovery across every opted-in seeker (not scoped to one job), outreach with a daily send cap, an agency profile, and a pipeline view of sent outreach and responses | `/recruiter/sign-in`, `/recruiter/sign-up` | Email + password |

A single chooser page, **`/join`**, exists specifically to solve "which account type am I creating" — three cards, one per role, each routing to that role's own sign-up flow, with each individual sign-up page also cross-linking to the other two. This is the existing precedent for segregating multiple audiences behind one front door.

### 1.4 AI features

- **Resume parsing/extraction.** Uploaded PDF resumes are parsed (`pdf-parse`) and turned into structured data (name, headline, summary, experience, education, skills) via an LLM call. Provider: **Mistral** (up to 3 rotated API keys to work around free-tier rate limits) with **OpenRouter** as a last-resort fallback. Extraction is designed to degrade gracefully — a flaky/truncated AI response falls back to a plain-text summary rather than blocking the action (e.g. blocking a job application).
- **Skill-based matching.** A resume's parsed skills are compared against a job's required skills to produce a match percentage — used both for a job's auto-shortlist threshold (employer/recruiter side) and for "jobs that match your resume" digest emails (seeker side).
- **Tailored resume generation.** Seekers can generate a resume tailored to a specific job listing ("Generate tailored resume" button on job pages).
- **AI-assisted content.** Guides and masterclass discovery are populated via scheduled AI jobs rather than fully manual editorial work.

### 1.5 Notifications & monetization

- **Transactional email** via Gmail SMTP (a deliberate low-cost choice over a transactional email provider — trades a "sent from a personal Gmail address" look and a ~500/day cap for zero cost and no custom-domain requirement). Covers: welcome emails (seeker, employer, recruiter — each on account creation), saved-search job alerts, resume-match digests, recruiter↔seeker outreach notifications, and password reset flows.
- **Cron-driven jobs**, run daily: job-scraper refresh, saved-search + resume-match alert digest, guide generation, masterclass discovery — all gated behind a `CRON_SECRET` bearer check (fail-closed).
- **Pricing** (`/pricing`) is currently a **content page, not a working checkout** — three tiers (Free / Featured $29 per job / Unlimited $99 per month) themed around *visibility* (featured/pinned placement) rather than gatekeeping access to posting at all. All plan CTAs currently point at `/contact` as a placeholder; no Stripe integration is wired up yet. Don't assume real billing exists anywhere in the current app.

### 1.6 Stack

Next.js 15 (App Router) + TypeScript, Supabase (Postgres, via `@supabase/supabase-js` with a service-role admin client server-side), NextAuth v5 (JWT sessions, role stored in the token), Bun, deployed on Vercel. Scraping is a standalone Node/Bun script (`scripts/scraper/`) with one file per source (`sources/mustakbil.ts`, `sources/naukrigulf.ts`, `sources/rss.ts`) feeding a shared `db.ts` writer, run on a schedule (cron / GitHub Actions).

**Brand:** the product is called **JobLo**. `config.example.ts` holds the single site title/description/URL — there is currently no concept of "more than one product" anywhere in config, nav, or auth.

---

## 2. The new product: Market Intel

**Client's framing (verbatim intent):** *"in addition to the job scraping tool, can we add another tool that scrapes Pakistan's e-commerce platforms. We will build a market intel service for marketing research."*

**Working interpretation:** a B2B tool for marketers/brands/agencies to track pricing, catalog, and positioning across Pakistani e-commerce marketplaces — the same "scrape → structure → surface trends" shape as the job board, aimed at a different audience and a different kind of data.

### 2.1 Candidate data sources (Pakistani e-commerce)

| Platform | Category focus | Notes |
|---|---|---|
| Daraz.pk | General marketplace (dominant player) | Alibaba-owned, largest catalog, likely the primary source |
| PriceOye.pk | Electronics/mobiles, price comparison | Already aggregates across sellers — could shortcut some data collection |
| iShopping.pk / Symbios.pk | Electronics | |
| Telemart.pk | Electronics/appliances | |
| HomeShopping.pk | General/home goods | |
| Shophive.com | General marketplace | |
| Naheed.pk, Alfatah.pk | Grocery/pharmacy chains with online storefronts | Different category, possibly out of scope for v1 |

**DECISION NEEDED:** which platforms are in scope for v1 vs. later. Recommend starting with 1–2 sources (Daraz + one electronics-focused site) to prove the pipeline before scaling source count — mirrors how the job scraper started with one source and added more over time.

### 2.2 What "market intel" means in practice — candidate feature set

Framed as a monitoring/benchmarking tool, similar in spirit to tools like Prisync or Price2Spy:

- **Catalog tracking** — structured product records per platform (title, brand, category, seller, price, rating, image, URL, in-stock status).
- **Price history** — time-series price points per product, so a client can see a price trend, not just a snapshot.
- **Change alerts** — notify when a tracked product's price drops/rises past a threshold, or goes out of stock.
- **Category/competitor dashboards** — e.g. "average price of Category X this week," "how does Brand A's pricing compare to Brand B's."
- **Watchlists** — a client tracks a specific brand, seller, or product set rather than the whole catalog.
- **Export / digest** — CSV export and/or a scheduled email summary (the job board already has a working email-digest pattern via cron — reusable shape).

**DECISION NEEDED:** who is the paying customer, and what do they actually want to see first? "Marketing research" is broad — narrowing to one or two concrete jobs-to-be-done (e.g. "track my competitor's pricing" vs. "understand category trends before a product launch") will change what the MVP dashboard needs to show.

### 2.3 Data model sketch (illustrative, not final)

Kept in a distinct table namespace so it never collides with job-portal tables (a real collision already happened once in this codebase between two same-named tables — worth actively avoiding here):

- `market_platforms` — the sources being scraped (name, base URL, scrape config).
- `market_products` — canonical product record per platform+external ID (title, brand, category, seller, current price, currency, rating, review count, image URL, product URL, first_seen_at, last_seen_at, is_active).
- `market_price_history` — (product_id, price, currency, captured_at) — append-only time series.
- `market_categories` — taxonomy, likely platform-specific initially, normalized later.
- `market_accounts` — the new user type for this product (company name, plan/tier, contact email).
- `market_watchlists` — (account_id, target: product/brand/category, alert rule).
- `market_alerts_sent` — dedup log, same shape as the recruiter outreach cap/dedup pattern already in use.

### 2.4 Scraping architecture

Recommend mirroring the existing job-scraper shape rather than inventing a new pattern: an orchestrator + one file per source + a shared DB writer, run on a schedule. Whether this lives in `scripts/scraper/sources/` alongside job sources or in a fully separate `scripts/market-scraper/` directory is a **DECISION NEEDED** (leaning separate directory — different domain, different schedule, different failure modes; no reason to entangle the two).

### 2.5 Legal/compliance flag

Scraping third-party e-commerce sites for a commercial product raises real ToS and rate-limiting questions (robots.txt compliance, request rate, data reuse terms). Not a design/layout concern, but should be raised with the client before scraper build starts, not after.

---

## 3. Segregation strategy — options

The client explicitly said "add another tool inside this but segregated." Three ways to read that:

**Option A — Same app, new role, new route namespace (recommended starting point).**
Add a fourth account type (e.g. `market_analyst`) alongside seeker/recruiter/employer, following the exact pattern already proven three times in this codebase: its own `lib/auth/*-accounts.ts`, its own sign-in/sign-up pages, its own dashboard under e.g. `/intel/*`, NextAuth role added to the existing JWT union. Fastest to ship, reuses all existing infra (email sending, rate limiting, admin Supabase client pattern), and the `/join`-style chooser pattern already exists to solve "which product/role am I."

**Option B — Same repo, separate Next.js app (monorepo).**
A second app deployed independently (own Vercel project, own domain or subdomain), sharing only the Supabase project and maybe a shared UI package. More isolation (no risk of one product's bug/traffic affecting the other), more setup overhead, and duplicates auth/email infra unless deliberately extracted into a shared package first.

**Option C — Fully separate product/repo.**
Clean separation, but throws away every reason to say "inside this" — essentially a new project. Only makes sense if the client actually wants two unrelated brands with nothing in common.

**DECISION NEEDED:** which option. Recommend **A** for v1 (fastest path to something demoable, and the codebase already has the exact scaffolding for "new role type" three times over), with an explicit note that this is not a permanent architectural commitment — if Market Intel takes off as its own business, splitting it into Option B later is a reasonable future move, not a mistake to avoid now.

### 3.1 Branding

**DECISION NEEDED:** is Market Intel a sub-brand under JobLo (e.g. "JobLo Market Intel"), or a distinct product name that happens to live in the same account system? This materially affects the homepage design — a sub-brand can live as a section of the existing JobLo homepage; a distinct brand probably wants its own landing page even if it shares the sign-in system underneath.

---

## 4. Homepage & navigation implications

Whatever the branding decision, the homepage and top nav currently assume **one product**. Concretely, these all need to account for a second product existing:

- **Root nav** (`Home / Jobs / Resources / Company / Sign in / Sign up / Post a Job`) — has no concept of a second product today. Needs either a nav item pointing at Market Intel, or a fully separate entry surface (subdomain/landing page) linked from the footer/nav.
- **`/join` chooser** — currently three cards (seeker/recruiter/employer), all under the "job portal" umbrella. If Market Intel becomes a fourth card here, the copy ("How will you use JobLo?") needs to make sense for someone who wants pricing intelligence, not a job. More likely this becomes a **two-tier chooser**: pick the product first (Jobs vs. Market Intel), then within Jobs pick seeker/recruiter/employer.
- **Sign-in routing** — the existing `AuthNavStatus` component already branches by `session.user.role` to send seeker → `/account`, recruiter → `/recruiter/dashboard`, employer → `/dashboard`. A `market_analyst` role slots into that same branch cleanly (→ `/intel/dashboard`).
- **Marketing homepage** — the current homepage (`components/home/HomePage.tsx`) is entirely job-board content (job search, categories, "Post a Job" CTA). It cannot silently also represent Market Intel; it needs either a dedicated section/banner introducing the second product, or Market Intel gets its own landing page reachable from here.

---

## 5. Open questions for the design/layout pass

Consolidated from above, since this doc is meant to hand off to a design-focused session:

1. Sub-brand or distinct brand? (affects homepage structure)
2. Same-app role (Option A) vs. separate app (Option B) — affects whether this is "one homepage with a section" or "one homepage linking out to another"
3. Which e-commerce platforms are in v1 scope
4. Who is the actual first customer / what's the one dashboard view that has to be right in v1
5. Does the `/join` chooser become two-tier, or does Market Intel get an entirely separate sign-up entry point (e.g. its own marketing page with its own "Get started")
6. Product name for Market Intel (placeholder needed if not decided yet)

---

## 6. Suggested phased rollout (not a commitment, just a sane default)

1. **Design phase (this handoff):** homepage/IA + sign-in/sign-up routing for two products.
2. **Schema + auth scaffolding:** `market_accounts` table, new role, sign-in/sign-up pages, empty dashboard shell — mirrors how the recruiter role was bootstrapped.
3. **One scraper source, one product table, one price-history table:** prove the pipeline end-to-end before adding sources.
4. **First real dashboard view** answering whatever question came out of open question #4 above.
5. **Alerts/watchlists, export, additional sources** — everything else, once the core loop is validated.
