# n8n Job Platform Workflows

> **Superseded.** Workflows 1 (collector) and 7 (stale sweeper) have been
> reimplemented in pure Python at [`../job-scraper/`](../job-scraper/README.md),
> which also adds several new sources and runs on a Windows Scheduled Task
> every 12 hours — no n8n instance required. This folder is kept for
> reference/history; nothing currently depends on it running. Workflow 6
> (daily Google Sheets export) has no Python equivalent and can still be run
> from here manually if you want it.

All six workflows are built. **Import and verify in order anyway** — each one depends on
the previous migration/columns existing, and it's much easier to spot a broken node when
you're only looking at what just changed.

## Files

```
migrations/
  001_create_jobs_table.sql       Workflow 1 — base jobs table
  002_add_entry_level.sql         Workflow 3 — entry_level boolean
  003_add_flagged_suspicious.sql  Workflow 4 — flagged_suspicious boolean
  004_add_score.sql               Workflow 5 — score integer (0-100)
  005_add_is_active.sql           Workflow 7 — is_active + discontinued_at
workflows/
  01-job-collector.json           Workflows 1+2+3+4+5, all combined into one workflow
  06-daily-sheet-export.json      Workflow 6 — separate workflow, untouched by the above
  07-stale-job-sweeper.json       Workflow 7 — separate workflow, marks dead postings inactive
```

Workflows 2–5 were specified as edits to "the existing job collector workflow," so they're
all folded into `01-job-collector.json` rather than shipped as five separate files — that
mirrors what you'd actually end up with in the n8n editor.

## 1. Run the migrations, in order

In the Supabase SQL editor, run all four files in `migrations/` in numeric order
(001 → 002 → 003 → 004). Each is additive (`add column if not exists`), so it's safe to
re-run if you're not sure what's already applied.

## 2. Auth is now hardcoded directly into both workflow files

Your n8n instance blocks `$env` access inside node expressions
(`N8N_BLOCK_ENV_ACCESS_IN_NODE`), which is what caused the earlier
**"access to env vars denied"** error. Since that can't be worked around from inside the
workflow JSON, all secrets are now hardcoded as literal values directly in the nodes that
need them — no credential setup, no env vars, nothing left to configure:

- **Supabase**: `Upsert Into Supabase` (workflow 01) and `Query Top Jobs` (workflow 06)
  send the `service_role` key as literal `apikey` / `Authorization: Bearer` headers.
- **Adzuna**: `Fetch Adzuna Jobs` has `app_id` and `app_key` hardcoded in the URL.
- **Jooble**: `Fetch Jooble Jobs` has the key hardcoded in the URL path.

**Because of this, both JSON files now contain live secrets in plain text.** Do not commit
them to a public repo, paste them into chats, or share them outside your own machine. If
you ever suspect they leaked, rotate the Supabase service role key, Adzuna key, and Jooble
key from their respective dashboards — rotating breaks these two files until you re-paste
the new values in.

The project URL (`https://yywqafhycdpahtropqam.supabase.co`) is also hardcoded — that part
isn't a secret, it's public in any client that talks to this Supabase project.

## 3. Import `workflows/01-job-collector.json`

### What it does, end to end

```
Every 6 Hours
  ├─ Fetch Remotive Jobs        → Normalize Remotive        ─┐
  ├─ Fetch Arbeitnow Jobs       → Normalize Arbeitnow        ─┤
  ├─ Fetch The Muse Page 0 ─┐                                 │
  ├─ Fetch The Muse Page 1 ─┼→ Merge Muse Pages → Normalize The Muse ─┤
  ├─ Fetch The Muse Page 2 ─┘                                 │
  ├─ Throttle → Fetch Adzuna Jobs  → Normalize Adzuna        ─┤
  ├─ Throttle → Fetch Jooble Jobs  → Normalize Jooble        ─┼→ Merge Sources (9 inputs)
  ├─ Fetch RemoteOK Jobs        → Normalize RemoteOK         ─┤
  ├─ Fetch WeWorkRemotely RSS   → Normalize WeWorkRemotely   ─┤
  ├─ Fetch Himalayas Jobs       → Normalize Himalayas        ─┤
  └─ Fetch Jobicy Jobs          → Normalize Jobicy           ─┘
                                                               ↓
                                          Entry-Level Filter  (sets entry_level, drops excluded)
                                                               ↓
                                          Quality Check       (sets flagged_suspicious)
                                                               ↓
                                          Score Jobs          (sets score 0-100)
                                                               ↓
                                          Upsert Into Supabase (dedupe by apply_url)
```

- **9 sources total**, all keyless except Adzuna/Jooble: Remotive, Arbeitnow, The Muse
  (3 pages), Adzuna, Jooble, RemoteOK, WeWorkRemotely (RSS), Himalayas, Jobicy. Between
  these you should comfortably clear 150-250+ jobs per run — well past the 90-100 target.
- Adzuna and Jooble each have a 3-second `Wait` node before the HTTP request purely to
  avoid firing all requests in the same instant. RemoteOK/WeWorkRemotely/Himalayas/Jobicy
  don't have a throttle — they're all keyless with generous/no published rate limits, and
  a single call per 6-hour run isn't going to trip anything.
- **RemoteOK** sends a `User-Agent` header — the API 403s without one. Schema: top-level
  array, first element is a legal notice (filtered out by checking `job.id`).
- **Himalayas** schema is **unverified** — the site blocks headless fetches, so the field
  mapping in `Normalize Himalayas` is inferred from documentation, not a live response.
  Check its actual output the first time you run the workflow; if fields come back empty,
  open the node's execution data and adjust the field names in the Code node.
- **WeWorkRemotely** is RSS, not JSON — title comes as `"Company: Job Title"` and gets
  split in the normalize step.
- If you want still more volume/diversity later, the next easy additions are per-company
  ATS feeds (Greenhouse, Lever, Ashby job-board APIs) — those need a target company list
  first, so they're a separate follow-up rather than something to bolt on blindly.
- **Entry-Level Filter**: matches title+description against include keywords (intern,
  graduate, junior, entry level, associate, 0-1/0-2 years, no experience, trainee) to set
  `entry_level`, and drops (does not insert) anything matching exclude keywords (5+ years,
  senior only, unpaid, commission-only).
- **Quality Check**: flags `flagged_suspicious` on pay-to-apply / training-fee /
  WhatsApp-only / crypto-trading language, missing company name, or unrealistic salary
  patterns. Suspicious jobs are **not** dropped — just marked, per spec.
- **Score Jobs**: plain arithmetic in a Code node (no AI), 0-100, clamped. Salary mention
  +20, posted ≤7 days ago +20, remote/hybrid +15, entry_level +15, has apply_url +10,
  flagged_suspicious −50, no salary and no description −10.
- **Upsert**: same dedupe mechanism as before — `Prefer: resolution=merge-duplicates`
  against the unique index on `apply_url`. Re-running never creates duplicates, it just
  refreshes the row (including a fresh score).

## 4. Import `workflows/06-daily-sheet-export.json`

Separate workflow, does not touch the collector.

```
Every Day at 8am → Compute 24h Cutoff → Query Supabase (score>60, last 24h, not suspicious)
                                       → Split Rows → Append To Google Sheet
```

Before running it:
- Create a Google Sheet with a header row matching: `title, company, location, remote_type,
  apply_url, source, posted_at, entry_level, flagged_suspicious, score, created_at`.
- In n8n, set up a Google Sheets OAuth2 credential, then open the "Append To Google Sheet"
  node and replace `SET_ME_GOOGLE_SHEET_ID` / `SET_ME_SHEET_NAME_OR_GID` with your actual
  sheet ID and tab name, and attach the credential.
- This is an **append-only daily log**, intentionally not deduplicated against previous
  days — Postgres is the source of truth, the Sheet is just for manual review.

## Verification checklist (do this before trusting the build)

1. Run migrations 001–004.
2. Re-import `01-job-collector.json` (or reload if already open) — no credential setup
   needed anymore, everything is wired.
3. Manually execute `01-job-collector.json` once in the n8n editor.
4. In Supabase, check the `jobs` table:
   - Rows exist with `source` in `remotive`, `arbeitnow`, `themuse`, `adzuna`, `jooble`,
     `remoteok`, `weworkremotely`, `himalayas`, `jobicy`.
   - Total row count is comfortably past 90-100.
   - `entry_level`, `flagged_suspicious`, `score` are populated (not null) on every row.
   - `score` values are sane — mix of ranges, not all 0 or all 100.
5. Run `01-job-collector.json` a second time — row count should **not** roughly double.
   That's your dedupe check.
6. Manually execute `06-daily-sheet-export.json` and confirm rows land in the Google Sheet
   with `score > 60` and `flagged_suspicious = false`.
7. Spot-check a few `apply_url` values by opening them — catches normalization bugs that
   pass every automated check but produce garbage links.

## 5. Import `workflows/07-stale-job-sweeper.json`

Separate workflow. Marks a job `is_active = false` once its `apply_url` is confirmed dead.

```
Every 3 Hours → Fetch Active Jobs (is_active=true) → Split Rows
             → Check Job URL (GET each apply_url, never throws on HTTP errors)
             → Classify Result (dead if statusCode in 400/403/404/410/451)
             → Only Confirmed Dead → Mark Discontinued In Supabase (PATCH is_active=false)
```

- **No source offers a "job closed" webhook** — there's no true push trigger available, so
  this polls instead. Every 3 hours is the closest practical approximation to "dynamic";
  lower `hoursInterval` in the trigger node if you want it tighter.
- **Deliberately conservative**: only HTTP status codes that unambiguously mean "gone"
  (400/403/404/410/451) mark a job dead. Timeouts, DNS failures, and other network errors
  are treated as "couldn't verify this time" and left alone — a false "discontinued" is
  worse than missing one for another 3 hours.
- Requests are batched (5 at a time, 1s apart) so a large `jobs` table doesn't fire 200+
  simultaneous requests at other companies' servers.
- This does not catch postings that quietly redirect to a company's generic careers page
  instead of 404ing — no generic way to detect that without per-source rules.

## Explicitly not built

Per the original scope: no user-matching, digest email, or application-tracker workflows.
Those need real users and a frontend first — next phase, not this one.

## Still on you

- Create the Google Sheet and OAuth2 credential for Workflow 6 (Supabase/Adzuna/Jooble are
  already wired, but Google Sheets needs its own OAuth login — nothing to hardcode there).
- Actually run the verification checklist above. A workflow JSON that parses cleanly is
  not the same as a workflow that produces correct data — the failure modes here are
  wrong field mappings and silent API errors, which only show up by running it.
- Treat both workflow JSON files as secret material from now on (see section 2).
