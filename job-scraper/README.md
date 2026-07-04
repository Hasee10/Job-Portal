# Job Scraper (Python) — replaces the n8n pipeline

Pure-Python replacement for `../n8n-workflows/`. Same Supabase `public.jobs`
table, same dedupe-by-`apply_url` semantics, same entry-level/quality/score
rules — just no n8n instance required. Runs on a Windows Scheduled Task
every 12 hours: scrapes every source below, upserts into Supabase, then
sweeps and deactivates postings whose `apply_url` now 404s/410s/etc.
(acquired, filled, or pulled listings).

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
| Naukri.com | https://www.naukri.com | **Prohibits automated scraping** |
| ZipRecruiter | https://www.ziprecruiter.com | **Prohibits automated scraping**; frequent bot interstitials |
| Jobright.ai | https://jobright.ai | Public listings are limited/likely login-gated; best-effort only |

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

5. **Install the 12-hour schedule** (Windows Task Scheduler — this machine
   has no native cron):
   ```
   powershell -ExecutionPolicy Bypass -File install_task.ps1
   ```
   This registers a task named `JobPortal-Scraper` that runs `run.py` every
   12 hours and again at every system startup (covers a missed run if the
   machine was off). Remove it with `uninstall_task.ps1`.

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
