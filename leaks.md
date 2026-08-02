# Credential Leak — Incident, Evidence & Remediation Record

**Status:** 🔴 **OPEN** — key not yet rotated as of last update
**Discovered:** 2026-08-02, during a full security audit
**Introduced:** 2026-07-01, commit `48803df`
**Exposure window:** 2026-07-01 → present (continuous, ~1 month+)

> **This document deliberately contains no secret values.** It records *what* leaked, *where*, *how it was verified*, and *what to do about it* — never the credentials themselves. Do not paste key material into this file.

---

## 0. Orientation — read this first if you're picking this up cold

**What this repo is.** A monorepo-ish workspace containing several related things:

| Path | What it is |
|---|---|
| `bordful-main/` | The main product — **JobLo**, a Next.js 15 (App Router) job board. TypeScript, NextAuth v5, Supabase, deployed on Vercel. |
| `n8n-workflows/` | Exported n8n automation workflows. **This is where the leak is.** |
| `job-scraper/` | Python job scraper (Adzuna, Jooble, ATS boards). |
| `market-intel/` | An extracted second product (Pakistan e-commerce price tracking). Dead code here — unwired from the app, being spun out. |
| `CloakBrowser-main/`, `cockroachdb/` | Ancillary tooling, not part of the leak. |

**The three account types in JobLo** (relevant to blast radius): job seekers (Google/LinkedIn OAuth), employers (email+password), recruiters (email+password). All three store PII.

**The database.** A single Supabase Postgres project, ref `yywqafhycdpahtropqam`, shared by the job board and (still) the extracted Market Intel tables. The app accesses it exclusively **server-side** using the `service_role` key via `@supabase/supabase-js` — there is no client-side Supabase usage in `bordful-main`. That architectural detail matters for §4: it's *why* enabling RLS is safe here.

**Two separate exposures are recorded in this document.** They are independent. Fixing one does not fix the other:
- **§1–§3** — a leaked `service_role` key (fix = rotate + purge)
- **§4** — RLS disabled with public `anon` write access (fix = SQL, unrelated to the key)

---

## 1. What leaked

A **Supabase `service_role` JWT** for the production project is hardcoded in two committed files:

- `n8n-workflows/workflows/01-job-collector.json`
- `n8n-workflows/workflows/06-daily-sheet-export.json`

In both files it appears twice — once as an `apikey` header value and once as an `Authorization: Bearer` value — inside n8n HTTP Request node parameters.

**Decoded JWT claims** (signature/value withheld):

| Claim | Value | Meaning |
|---|---|---|
| `iss` | `supabase` | Issued by Supabase |
| `ref` | `yywqafhycdpahtropqam` | **The live production project** |
| `role` | `service_role` | **Bypasses all Row Level Security** |
| `iat` | `1782890622` → 2026-07-01 | Issued the day of the leak commit |
| `exp` | `2098466622` → **2036-06-30** | ~10 year validity — no natural expiry rescue |

Also present in these files, lower severity: Adzuna `app_id`/`app_key` and a Jooble API key (per the `.gitignore` comment). These should be rotated too but carry far less impact — they're third-party job-feed read keys, not database access.

---

## 2. Why this is critical — three compounding factors

### 2.1 The repository is public

Verified unauthenticated:
```bash
curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/Hasee10/Job-Portal
# → 200   (200 = public; 404 = private or nonexistent)
```

### 2.2 The key is at current `HEAD`, not merely buried in history

This is the part that's easy to get wrong. A `.gitignore` rule exists:

```gitignore
# n8n workflow exports contain hardcoded live API keys (Supabase service_role,
# Adzuna, Jooble). Keep them local only.
n8n-workflows/workflows/*.json
```

**`.gitignore` has no effect on files that are already tracked.** The files were committed on 2026-07-01; the ignore rule was added later and did nothing. Verify:

```bash
git ls-files n8n-workflows/workflows/
# → 01-job-collector.json
#   06-daily-sheet-export.json      ← still tracked

git show HEAD:n8n-workflows/workflows/01-job-collector.json | grep -c "eyJhbGciOi"
# → non-zero: the JWT is in the current commit
```

So this is **not** a "clean it from history someday" problem. The credential is on the GitHub web UI right now, at `HEAD`, on a public repo.

### 2.3 `service_role` bypasses all Row Level Security

It is the PostgREST equivalent of a database superuser. RLS policies, table grants, and every other in-database access control are irrelevant to a holder of this key.

### Blast radius

Full read/write/delete on every table in the production database:

| Table | Sensitive contents |
|---|---|
| `job_seekers` | Names, email addresses, `open_to_recruiters` flag |
| `seeker_resumes` | **Full parsed resumes** — employment history, education, skills, summaries |
| `job_application_submissions` | **Resume snapshots + cover letters** per application |
| `employers` | Company details, emails, **bcrypt password hashes** (offline cracking) |
| `recruiter_accounts` | Recruiter identities, emails, **bcrypt password hashes** |
| `candidate_outreach` | Private recruiter → candidate messages |
| `employer_candidate_invites` | Private employer → candidate invitations |
| `saved_searches`, `seeker_profiles` | Job-search preferences and behavioural data |

Realistic attacker actions: mass PII exfiltration; offline cracking of employer/recruiter passwords (bcrypt cost 12 — slow, but weak passwords fall); silent data tampering (e.g. redirecting `apply_url` on listings to a phishing site); destructive deletion.

This plausibly constitutes a reportable personal-data breach. Pakistan currently has no dedicated data protection statute (PECA 2016, amended 2025, is the operative framework and its §38 addresses unauthorized transfer of personal data), but any EU/UK data subjects among the users would bring GDPR notification duties into scope.

---

## 3. Remediation checklist — ordered, do not reorder

**Rotate first.** History rewriting is slow, coordination-heavy, and visible; rotation is the step that actually closes the exposure. Doing them in the wrong order leaves a live key public for the duration of the rewrite.

- [ ] **Step 1 — Rotate the key.**
  Supabase Dashboard → Project `yywqafhycdpahtropqam` → Settings → API → *Legacy API keys* → revoke/rotate `service_role`.
  Treat the old key as fully compromised; do not attempt to reason about whether anyone found it.

- [ ] **Step 2 — Update every consumer** with the new key. Missing one causes a silent production outage:
  - Vercel → project env vars → `SUPABASE_SERVICE_ROLE_KEY` (**all** environments: Production, Preview, Development)
  - GitHub → repo Secrets → `SUPABASE_SERVICE_ROLE_KEY` (consumed by `.github/workflows/scrape.yml`)
  - Any developer's local `bordful-main/.env.local`
  - **The n8n instance itself** — store it as an n8n *credential object*, never inline in workflow node parameters. Inline is what caused this.

- [ ] **Step 3 — Untrack the files.** They're already gitignored, so they persist on disk but leave the index:
  ```bash
  git rm --cached n8n-workflows/workflows/01-job-collector.json \
                  n8n-workflows/workflows/06-daily-sheet-export.json
  git commit -m "Untrack n8n workflow exports containing credentials"
  git push origin main
  ```
  After this, `HEAD` is clean. History is not.

- [ ] **Step 4 — Purge from history.** Destructive rewrite — announce to all collaborators first, since every open branch/PR must be rebased:
  ```bash
  # git-filter-repo is the maintained replacement for filter-branch / BFG
  git filter-repo --path n8n-workflows/workflows --invert-paths
  git push --force-with-lease origin --all --tags
  ```

- [ ] **Step 5 — Ask GitHub Support to expire cached objects.**
  A force-push does *not* immediately remove old blobs — they stay reachable by direct commit SHA until GitHub garbage-collects, and forks/caches may retain them. Only GitHub Support can force this. This step is routinely skipped and is the reason "we rewrote history" often isn't sufficient on its own.

- [ ] **Step 6 — Audit for abuse.**
  Supabase → Logs → filter API requests authenticated as `service_role` originating from IPs **outside** Vercel and GitHub Actions ranges, from 2026-07-01 onward. Look for bulk `SELECT` on `job_seekers` / `seeker_resumes` / `job_application_submissions`, and any `DELETE`/`UPDATE` not attributable to the app.
  ⚠️ Supabase log retention is finite (plan-dependent, often 7 days on lower tiers) — **do this early**, and export before it ages out. Given the ~1 month exposure window, the earliest part of it is likely already unauditable.

- [ ] **Step 7 — Decide on breach notification** based on Step 6 findings and the jurisdictions of affected users.

- [ ] **Step 8 — Rotate the secondary keys** (Adzuna `app_id`/`app_key`, Jooble API key) in the same files. Lower impact, but they leaked identically.

---

## 4. Separate exposure — RLS disabled with public `anon` write access

**Rotating the `service_role` key does not fix this.** Track it independently.

Three tables have **Row Level Security disabled**, and the public `anon` role holds full privileges:

| Table | RLS | `anon` grants |
|---|---|---|
| `job_application_submissions` | ❌ **off** | SELECT, INSERT, UPDATE, DELETE, TRUNCATE |
| `employer_candidate_invites` | ❌ **off** | SELECT, INSERT, UPDATE, DELETE, TRUNCATE |
| `market_intel_waitlist` | ❌ **off** | SELECT, INSERT, UPDATE, DELETE, TRUNCATE |

The Supabase **`anon` key is public by design** — it is meant to ship to browsers and is not a secret. Combined with the project ref (now public via this very leak), anyone can query PostgREST directly:

```
GET https://yywqafhycdpahtropqam.supabase.co/rest/v1/job_application_submissions?select=*
apikey: <public anon key>
```

…returning every job application ever submitted, including resume snapshots and cover letters. The `DELETE`/`TRUNCATE` grants additionally permit destroying all application data.

**Contrast:** the other 15 tables have RLS *enabled* with zero policies — which is correct deny-by-default behaviour for `anon`. These three were simply missed when created.

### Fix

```sql
ALTER TABLE public.job_application_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_candidate_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intel_waitlist       ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.job_application_submissions,
              public.employer_candidate_invites,
              public.market_intel_waitlist
  FROM anon, authenticated;
```

**Why this is safe to apply immediately:** every application read/write goes through the server-side `service_role` client (see §0), which bypasses RLS by design. Enabling RLS with no policies denies `anon`/`authenticated` while leaving the app's own access untouched. Expect **zero** functional change.

**Verification after applying:**
```bash
# Should return [] or a permission error, NOT data:
curl "https://yywqafhycdpahtropqam.supabase.co/rest/v1/job_application_submissions?select=id" \
  -H "apikey: <anon key>"
```
Then exercise the app: submit a job application, open the employer applications view, confirm both still work.

---

## 5. Why this wasn't caught — process post-mortem

Worth recording, because the failure was procedural rather than technical.

1. **Secret scanning was added *after* the leak.** `.github/workflows/secret-scan.yml` (gitleaks) landed at commit `be3c3ca` on **2026-07-06** — five days after the leak at `48803df` on **2026-07-01**.

2. **The leak was already known.** That workflow's own header comment names it explicitly:
   > *"the n8n-workflows/workflows/\*.json leak (Supabase service_role, Adzuna, Jooble keys committed at 48803df) would have been flagged here had this existed at the time."*

3. **Remediation was attempted but ineffective.** A `.gitignore` entry was added. As established in §2.2, that does nothing for already-tracked files. The person who wrote it reasonably believed the problem was handled. **This is the core lesson: `.gitignore` is not a remediation step — `git rm --cached` + rotation is.**

4. **CI scanning reports but doesn't enforce.** gitleaks runs with `fetch-depth: 0` (full history) on every push/PR, so it very likely *has* been flagging this on every run for a month, with no one acting on the output.

---

## 6. Prevention — controls to add

| Control | Why it matters here |
|---|---|
| **GitHub Secret Scanning + Push Protection** | Free on public repos. Blocks the push *before* the secret becomes public, rather than reporting after. For Supabase-format keys GitHub also auto-notifies the provider. Strictly superior to CI-side gitleaks, which by definition only fires post-exposure. **Highest-value single control.** |
| **Local `pre-commit` gitleaks hook** | Catches secrets on the developer's machine, before any branch. |
| **Never commit n8n workflow exports** | n8n inlines credential values into exported JSON by default. Use n8n's credential store and export sanitized, or keep exports out of VCS entirely (the current `.gitignore` intent — just needs the untracking to match). |
| **Scoped DB roles instead of `service_role`** | The job-collector workflow only needed `INSERT` on `jobs`. A dedicated Postgres role with exactly that grant would have made this leak largely inert. Applying least privilege here is the difference between "rotate a key" and "full database compromise." |
| **Key rotation policy (90 days)** | A 10-year key means one mistake is a decade-long liability. Bounded lifetime bounds blast radius. |
| **RLS enforced in CI** | Supabase Security Advisor / `supabase db lint` flags any `public` table without RLS. Wire it as a required check — it would have caught §4 at PR time. |
| **Act on scanner output** | A scanner whose findings are never triaged provides documentation, not defense. Route gitleaks findings to something with an owner. |

---

## 7. Decision log

Recording deliberate choices so they aren't re-litigated or mistaken for oversights.

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-02 | **Publish this file to the public repo before rotating the key** | Recommended against by the audit (it signposts a still-live credential in the same public repo that contains it, raising discoverability from "must run a scanner" to "stated in the docs"). Repo owner made an informed decision to proceed anyway. **This makes Step 1 rotation more urgent, not less.** |
| 2026-08-02 | No secret values included in this document | Documenting the leak must not widen it. |

---

## 8. Reproducing the evidence

Commands used to establish every claim above, for independent verification:

```bash
# Repo is public
curl -s -o /dev/null -w "%{http_code}\n" https://api.github.com/repos/Hasee10/Job-Portal

# Files still tracked at HEAD despite .gitignore
git ls-files n8n-workflows/workflows/

# JWT present in the CURRENT commit (not just history)
git show HEAD:n8n-workflows/workflows/01-job-collector.json | grep -c "eyJhbGciOi"

# Decode claims without revealing the signature (payload is the 2nd segment)
git show HEAD:n8n-workflows/workflows/01-job-collector.json \
  | grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" | head -1 \
  | cut -d. -f2 | tr '_-' '/+' | base64 -d

# Leak commit vs. secret-scanning introduction
git log -1 --format="%h %ci %s" 48803df
git log --diff-filter=A --format="%h %ci %s" -- .github/workflows/secret-scan.yml
```

RLS and grant state (§4) verified via SQL against the live project:
```sql
SELECT relname, relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY relrowsecurity, relname;

SELECT table_name, grantee, string_agg(privilege_type, ',') AS privs
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
GROUP BY table_name, grantee;
```

---

## 9. References

| Item | Location |
|---|---|
| Full security audit (all findings, all severities) | `AUDIT.md` |
| Leak commit | `48803df` — 2026-07-01 |
| Secret scanning introduced | `be3c3ca` — 2026-07-06 |
| Affected files | `n8n-workflows/workflows/01-job-collector.json`, `…/06-daily-sheet-export.json` |
| Supabase project ref | `yywqafhycdpahtropqam` |
