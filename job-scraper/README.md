# Job Scraper (Python) — replaces the n8n pipeline

Pure-Python replacement for `../n8n-workflows/`. Same Supabase `public.jobs`
table, same dedupe-by-`apply_url` semantics, same entry-level/quality/score
rules — just no n8n instance required. Runs on a Windows Scheduled Task
every 12 hours: scrapes every source below, upserts into Supabase, then
sweeps and deactivates postings whose `apply_url` now 404s/410s/etc.
(acquired, filled, or pulled listings).

## Apply-link reality check

A job board is only as useful as its "Apply" button. Several of the free
API sources deliberately keep visitors on their own site rather than
exposing a link to the employer's real application page. Verified by hand
against each source's live API and website (2026-07):

| Source | apply_url destination |
|---|---|
| Greenhouse / Lever / Ashby boards | **Direct** — these fields are already the real ATS, nothing to resolve |
| Arbeitnow | **Resolved to the real employer page** — `{arbeitnow_url}/apply` 302-redirects to the actual ATS (e.g. join.com); `sources/arbeitnow.py` follows that redirect and stores the final URL |
| The Muse | **Resolved when possible** — the API only gives a themuse.com page, but its "Apply on company site" button opens the real destination in a new tab; `sources/browser/themuse_resolver.py` clicks it via a real browser to capture that URL. Not every posting has this button (some use The Muse's own application flow) — those fall back to the themuse.com page |
| Adzuna, Jooble | **Tracking redirect, but does reach the real site** — `redirect_url`/`link` are the providers' own click-tracking links, which do forward to the employer's page after the redirect (unlike the sources below, this isn't a dead end) |
| RemoteOK | **No real link available** — confirmed by clicking their own "Apply" button in a real browser: it stays on remoteok.com, no external redirect exists |
| Remotive, Jobicy | **Unverified** — both are behind a Cloudflare bot-check that the free CloakBrowser tier can't pass through; would need a residential proxy or CloakBrowser Pro license to check whether their web page (not just the API) exposes a real link the way Arbeitnow's did |
| Himalayas | **No real link available** — confirmed directly: even Himalayas' own web page has no outbound application link, applying requires signing up on Himalayas itself |

For the sources with no real link, `apply_url` points to the aggregator's
own job page (which has its own apply flow) rather than failing to import
the job at all.

## Sources & links

### Plain API/RSS sources (no browser, no ToS concerns — all built for programmatic use)

| Source | Link | Auth |
|---|---|---|
| Remotive | https://remotive.com/api-documentation | none |
| Arbeitnow | https://www.arbeitnow.com/api/job-board-api | none |
| The Muse | https://www.themuse.com/developers/api/v2 | none |
| Adzuna | https://developer.adzuna.com/ | free API key |
| Jooble | https://jooble.org/api/about | free API key |
| RemoteOK | https://remoteok.com/api | none (requires a `User-Agent` header) |
| We Work Remotely | https://weworkremotely.com/categories/remote-programming-jobs.rss | none (RSS) |
| Himalayas | https://himalayas.app/jobs/api | none |
| Jobicy | https://jobicy.com/api/v2/remote-jobs | none |
| Greenhouse company boards | https://boards-api.greenhouse.io/v1/boards/{token}/jobs | none (public per-company API) |
| Lever company boards | https://api.lever.co/v0/postings/{token} | none (public per-company API) |
| Ashby company boards | https://api.ashbyhq.com/posting-api/job-board/{token} | none (public per-company API) |

Greenhouse/Lever/Ashby have no global search — you supply company board
tokens in [`jobscraper/sources/companies.json`](jobscraper/sources/companies.json)
or via `ATS_EXTRA_BOARDS` in `.env`. A starter list of ~30 well-known
companies is included; add your own by finding a company's `/careers` page
and reading the board token out of its URL.

### Browser-rendered sources (via CloakBrowser, `../CloakBrowser-main`)

| Source | Link | ToS status |
|---|---|---|
| hiring.cafe | https://hiring.cafe | No scraping prohibition found; SSR HTML, no login wall |
| Indeed | https://www.indeed.com | **Prohibits automated scraping in its ToS** |
| Glassdoor | https://www.glassdoor.com | **Prohibits automated scraping**; paywalls most results behind login |
| Naukri.com | https://www.naukri.com | **Prohibits automated scraping**; currently blocked at Akamai's WAF - needs `SCRAPER_PROXY` (residential) to have any chance of getting through |
| ZipRecruiter | https://www.ziprecruiter.com | **Prohibits automated scraping**; frequent bot interstitials, and its results are a click-only SPA with no stable per-job link - currently yields 0 jobs |
| Dice | https://www.dice.com/jobs | ToS not successfully checked (fetch attempts blocked). Listings are real and detailed (~95k+ live), but confirmed by hand: "Apply Now" forces a free Dice account signup/login before the application even starts - there's no way to reach the employer directly |
| Levels.fyi | https://www.levels.fyi/jobs | ToS not successfully checked. High credibility - every listing carries salary-band data, and confirmed by hand: "Apply Now" goes straight to the real employer's ATS (e.g. a `grnh.se` Greenhouse short link), no login wall |

**Dropped:** Jobright.ai turned out to be a genuine "Sign In / Join Now"
gated AI job-matching product with no public listings at all - not a
bot-blocking problem CloakBrowser could work around. The module is still in
`jobscraper/sources/browser/jobright.py` for reference but isn't wired into
`BROWSER_SOURCES`. Automating a login with a real personal account was
considered and rejected - see the conversation history for the reasoning
(Google actively blocks automated sign-in, and it would mean storing a real
account password in `.env`/GitHub secrets).

**Read this before enabling the ToS-restricted sources.** Indeed, Glassdoor,
Naukri, and ZipRecruiter all explicitly forbid automated access in their
Terms of Service. Running those scrapers is a ToS violation regardless of
how well CloakBrowser hides the automation — it just avoids getting blocked
while doing it. That's a call you're making knowingly, not something this
code decides for you. If you want to disable them, remove the relevant
modules from `BROWSER_SOURCES` in
[`jobscraper/sources/browser/__init__.py`](jobscraper/sources/browser/__init__.py),
or run everything with `python run.py --no-browser` to skip all
browser-based sources and keep only the API/RSS ones.

Browser-based selectors (CSS class names, etc.) are pinned to what each
site's markup looked like when this was written and **will drift** as those
sites redesign — that's inherent to scraping a site with no stable API, not
a bug. If a source in `jobscraper/sources/browser/` starts returning 0 jobs,
open the search URL in a real browser, inspect a job card, and update the
`*_SELECTORS` lists at the top of that source's file.

## Setup

1. **Install Python 3.11+** and dependencies:
   ```
   pip install -r requirements.txt
   python -m playwright install chromium
   python -m cloakbrowser install
   ```

2. **Copy `.env.example` to `.env`** and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — same Supabase project
     bordful-main reads from (Project Settings → API → `service_role`, not
     `anon` — writes need to bypass Row Level Security). **Never commit this
     file**; `.gitignore` already excludes `.env*`.
   - `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` — free at https://developer.adzuna.com/
   - `JOOBLE_API_KEY` — free at https://jooble.org/api/about
   - `SCRAPER_PROXY` (optional but recommended for the ToS-restricted
     sources) — a residential proxy URL. Datacenter/cloud IPs get blocked
     fast by Indeed/Glassdoor/Naukri.
   - `CLOAKBROWSER_LICENSE_KEY` (optional) — Pro key from
     https://cloakbrowser.dev for the newer/more-patched Chromium build.
     The free build (no key) works fine for hiring.cafe and is a reasonable
     starting point for the others.

3. **Database schema** — already applied if you ran the old n8n migrations
   (`../n8n-workflows/migrations/001` through `006`). If starting fresh, run
   those six SQL files against your Supabase project in order first; this
   scraper writes to the exact same `public.jobs` table/columns.

4. **Run once manually** to verify:
   ```
   python run.py
   ```
   Check Supabase: rows should appear with `source` values matching the
   tables above (e.g. `remotive`, `greenhouse:stripe`, `hiringcafe`, ...).
   Run it a second time — the row count should not roughly double (that's
   the dedupe-by-`apply_url` check).

5. **Install the local 12-hour schedule** (Windows Task Scheduler — this
   machine has no native cron). This uses a dedicated virtualenv so the task
   doesn't depend on whatever `python` happens to resolve to on PATH:
   ```
   python -m venv .venv
   .venv\Scripts\pip install -r requirements.txt
   .venv\Scripts\python -m playwright install chromium
   .venv\Scripts\python -m cloakbrowser install
   .\install_task.ps1
   ```
   This registers a task named `JobPortal-Scraper` that runs every 12 hours
   and again at every system startup (catches up a run that was missed
   while the PC was off). Output is appended to `logs/run.log`. Remove it
   with `.\uninstall_task.ps1`.

   **Important limitation:** this only runs while the PC is powered on. If
   the machine is off at the 12-hour mark, that run is skipped entirely (it
   fires once at next boot instead, not retroactively). See step 6 for a
   schedule that runs regardless of this machine's power state.

6. **Run regardless of whether this PC is on** — a GitHub Actions workflow
   at [`../.github/workflows/scrape.yml`](../.github/workflows/scrape.yml)
   runs the exact same `run.py` every 12 hours on GitHub's own cloud
   runners. It's additive, not a replacement — both write to the same
   Supabase table via the same idempotent upsert, so having both enabled
   just means the table gets refreshed by whichever one runs first each
   cycle. To enable it:
   - Push this repo to GitHub (already done if you're reading this from a
     clone) and make sure Actions are enabled for it (Settings → Actions).
   - Add these as **repository secrets** (Settings → Secrets and variables
     → Actions → New repository secret) — same values as your local `.env`:
     `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADZUNA_APP_ID`,
     `ADZUNA_APP_KEY`, `JOOBLE_API_KEY`, and optionally `SCRAPER_PROXY` /
     `CLOAKBROWSER_LICENSE_KEY`.
   - That's it — the workflow's `cron: "0 */12 * * *"` trigger picks it up
     automatically. Trigger a one-off test run from the Actions tab via
     "Run workflow" (the `workflow_dispatch` trigger) before waiting 12
     hours to see if it works.
   - Caveat: GitHub Actions runners use well-known datacenter IP ranges, so
     the Indeed/Glassdoor/Naukri/ZipRecruiter sources are more likely to get
     blocked there than from a home connection unless you set
     `SCRAPER_PROXY` to a residential proxy. The 9 plain API sources and the
     Greenhouse/Lever/Ashby boards are unaffected either way.

7. **Bound database growth long-term** — the sweeper only ever sets
   `is_active=false` on a dead posting, it never deletes anything. Left
   alone forever, the table grows without bound even though most of that
   growth is jobs nobody can apply to anymore. Supabase's free tier caps
   the whole database at 500MB. Run this occasionally (weekly/monthly is
   plenty - it's not part of the 12h collector run):
   ```
   python retention_cleanup.py --dry-run   # see what would be deleted first
   python retention_cleanup.py             # actually delete
   ```
   Deletes jobs discontinued more than `RETENTION_DAYS` (default 90, set in
   `.env`) days ago. Override per-run with `--days N`. Never touches active
   jobs or ones discontinued more recently than the window.

## What each run does

```
python run.py
  ├─ collect_api_sources()      9 API/RSS sources + Greenhouse/Lever/Ashby boards
  ├─ collect_browser_sources()  hiring.cafe, Indeed, Glassdoor, Naukri, ZipRecruiter, Jobright
  │                             (one shared CloakBrowser session for all six)
  ├─ scoring.process()          entry-level filter -> suspicious-content flag -> 0-100 score
  ├─ db.upsert_jobs()           upsert into Supabase, dedupe on apply_url unique index
  └─ sweeper.sweep()            re-check every currently-active apply_url;
                                mark is_active=false on the same job's row
                                (this is how "acquired"/filled/pulled postings
                                get removed from the portal)
```

Any single source failing (network error, selector drift, rate limit) is
caught and logged — it doesn't take the rest of the run down. Check logs
(stdout, or Task Scheduler's history for the `JobPortal-Scraper` task) for
`fetch failed` lines to see which sources need attention.

## Relationship to `../n8n-workflows/`

That folder is now superseded — this project reimplements workflows 1
(collector) and 7 (stale sweeper) in Python, plus adds the new sources.
Workflow 6 (daily Google Sheets export for manual review) has no Python
equivalent here since it wasn't part of this scope; the n8n workflow JSON
still exists if you want to keep running that one piece, but nothing else
depends on an n8n instance anymore.
