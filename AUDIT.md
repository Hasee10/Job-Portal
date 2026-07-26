# JobLo Auth/Security Audit

Route-by-route pass across all 53 pages and 34 API routes. Only real findings are listed below (routes confirmed correctly guarded aren't itemized individually).

## Summary

| # | Finding | Risk | Status |
|---|---|---|---|
| 1 | Homepage renders authenticated seeker UI (tabs, bookmark icon) unconditionally in the DOM for guests | **Low** (not a data leak — see below) | Fixing (Part 1) |
| 2 | Open redirect via unvalidated `callbackUrl` after employer/recruiter sign-in | **Medium** | Fixing now |
| 3 | Three GitHub Actions cron workflow comments describe stale (pre-fix) fail-open behavior | **Informational** | Flagging, not silently fixing |
| — | Everything else checked (auth checks, ownership scoping, cron gating, JWT trust, password reset, signup role assignment) | — | **No issues found** |

---

## Finding 1 — Homepage guest state (the reported bug)

**What I verified, not just assumed:** I traced every action the homepage exposes — Apply, Bookmark, Mark Applied/Not Interested, and the Bookmarked/Applied/Not Interested tabs — down to the client code that handles them.

- `SaveJobButton`, `JobApplicationActions`, and the tab-click handler in `HomePage.tsx` (`components/home/HomePage.tsx`) **all already check `useSession()` and redirect to `/account/sign-in?callbackUrl=...` before doing anything**, for a guest.
- `SeekerJobStateContext` (the hook feeding `savedJobIds`/`applications`/`isSeeker`) **only fetches `/api/seeker/job-states` when `status === 'authenticated' && isSeeker`** — a guest never even issues that request, so there's no server-side data leak.
- `ApplyModal` explicitly checks `session?.user` and renders a "Sign in to apply" prompt instead of the real form when there's no session.
- `app/page.tsx` (the server component) only ever fetches public job data (`getJobs`, `getActiveJobsCount`, testimonials) — it never calls `auth()` and never fetches anything seeker-specific server-side.

**So: this is not a data leak or a broken auth check.** Every actual action is already correctly gated. What's real: the Bookmarked/Applied/Not Interested **tabs and the bookmark icon render in the DOM for every visitor**, whether or not they mean anything for that visitor — clicking them for a guest works (redirects to sign-in), but the UI presents itself as if a personalized dashboard exists before you've done anything. That's a real UX/architecture problem worth fixing per HP.md's design (and matches "don't assume a session exists" in spirit), just not the severity the initial framing implied ("full authenticated dashboard rendered to every visitor" overstates it — no seeker data, saved jobs, or application state is ever shown to or fetched for a guest).

**Fix:** implementing HP.md's guest/seeker split as specified — guest state drops the tabs and bookmark affordance from the DOM entirely (not CSS-hidden), signed-in seeker keeps the current experience unchanged.

---

## Finding 2 — Open redirect via `callbackUrl` (real gap, fixing)

**Where:** `components/auth/SignInForm.tsx:45-46` and `components/auth/RecruiterSignInForm.tsx:44-45`:

```js
const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
router.push(callbackUrl);
```

`callbackUrl` is read straight from the query string with **no validation** that it's an internal path. A crafted link like `/sign-in?callbackUrl=https://evil-lookalike.com` would, after a real successful login, attempt to send the browser there.

**Why it's Medium and not Critical:** `router.push()` is Next.js's client-side router (`next/navigation`), which drives the browser's History API — and `history.pushState`/`replaceState` throws for a different-origin URL (browsers enforce this natively). So today, in evergreen browsers, this doesn't actually cause a live cross-origin redirect; it likely no-ops or errors. That's incidental protection from a browser API restriction, not a deliberate safeguard in this code — the exact kind of thing that becomes a real, fully-working open redirect the moment someone "fixes" the perceived no-op by switching to `window.location.href = callbackUrl` (a natural-looking change for a dev who doesn't know why the push silently failed).

**Fix (implementing now):** validate `callbackUrl` starts with `/` and not `//` (protocol-relative) before using it; fall back to the safe default otherwise. Same one-line guard in both forms.

**Note:** `SeekerSignInButtons.tsx` passes `callbackUrl` straight into next-auth's own `signIn(provider, { callbackUrl })` — that goes through NextAuth's own `redirect` callback, which (since this app doesn't override it) already validates same-origin by default. Only the two manual `router.push` call sites needed a fix.

---

## Finding 3 — Stale documentation in cron workflow comments (flagging, not fixing silently)

`.github/workflows/job-alerts-cron.yml`, `guide-content-cron.yml`, and `masterclass-discovery-cron.yml` all contain comments stating that `CRON_SECRET` is currently unset in Vercel and that the cron endpoints "currently" accept unauthenticated requests. **That's no longer true** — `app/api/cron/*` routes were fixed in an earlier pass to fail closed:

```js
if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

This means:
- The actual routes are correctly locked down (no live exposure here — this is the opposite finding from what the stale comments describe).
- **But** if `CRON_SECRET` genuinely isn't set in Vercel's env vars right now, all three cron endpoints — including Vercel's own configured cron for `search-alerts` — will 401 on every single invocation, silently breaking the scheduled jobs (guides, masterclasses, alerts) rather than leaving them open.

**This needs a decision, not a silent fix:** I can update the three comment blocks to reflect the current fail-closed behavior, but I can't confirm from the repo whether `CRON_SECRET` is actually set in the live Vercel project. **Can you confirm it's set?** If not, these cron jobs are currently non-functional in production, not insecure.

---

## Everything checked and confirmed correct (no action needed)

- **Server-side auth checks:** every route returning user-specific data (bookmarks, applications, resume, saved searches, employer applicant lists/profile, recruiter outreach/pipeline/profile) calls `auth()` server-side and checks `session.user.role` before returning data. Verified by diffing all 34 API routes against which ones call `auth()` — the only routes that don't are the 3 cron endpoints (secret-gated instead) and the 6 public signup/forgot-password/reset-password routes (correctly public by design) plus the NextAuth handler itself.
- **Ownership scoping:** every write/read that touches another table's row (saved searches, invites, applications, jobs, outreach) filters by `session.user.id` at the database query level (`.eq('employer_id', employerId)` / `.eq('recruiter_id', recruiterId)` / `.eq('seeker_id', seekerId)`), not just by receiving the ID as an unused parameter — traced this through the actual `lib/jobs/*-actions.ts` implementations, not just the route handlers, since a route can call `auth()` correctly and still leak by trusting a client-supplied ID downstream. No such gap found — confirmed for `employer-candidate-actions.ts`, `application-actions.ts`, `employer-job-actions.ts`, `candidate-outreach-actions.ts`.
- **Role confusion / privilege escalation:** `app/dashboard/page.tsx` and `app/recruiter/dashboard/page.tsx` both redirect away any session whose role doesn't match (`if (session.user.role !== 'employer') redirect('/')`, same for recruiter) — a seeker's session cannot reach either. `app/account/page.tsx` does the inverse (employer/recruiter sessions get redirected to their own dashboards). No page found that checks "is there a session" without also checking "is it the *right* role."
- **CRON_SECRET gating:** all three cron routes use the identical fail-closed pattern (see Finding 3 for the one caveat, which is about the comments/config, not the code).
- **NextAuth JWT trust:** `token.role` is set server-side in the `jwt` callback based on `account.provider` (set by NextAuth itself from which provider actually completed auth, not client-controllable) and on DB lookups (`verifyEmployerCredentials`/`verifyRecruiterCredentials`/`upsertJobSeeker`). The one client-supplied field, `accountType` on the recruiter sign-in form, only selects *which verification function runs* — it can't grant a role without that function independently confirming a matching account+password in the database first.
- **Password reset flows:** both employer and recruiter forgot-password endpoints return an identical generic response regardless of whether the email exists (no enumeration), are rate-limited, and reset tokens are hashed at rest, single-use (cleared after success), and expire after 1 hour — checked in both `lib/auth/employers.ts` and `lib/auth/recruiter-accounts.ts`.
- **Signup role assignment:** `/api/employers/signup` and `/api/recruiters/signup` never read a `role`/`accountType` field from the request body — which table a signup writes to is fixed by which endpoint is called, not by any client input, so there's no way to submit to one endpoint and land in the other role's table.

---

## What I'm doing next (per the task)

1. Fixing Finding 2 (open redirect) now, alongside the homepage split — small, unambiguous, no product decision needed.
2. Implementing the homepage guest/seeker split (Finding 1 / Part 1 of the task).
3. **Not** touching the GitHub Actions workflow comments (Finding 3) without your confirmation on whether `CRON_SECRET` is actually set in Vercel — let me know and I'll update them to match.
