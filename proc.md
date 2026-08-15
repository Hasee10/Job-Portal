# Procurement Module (RFx Engine) — Build Spec

## 0. Status

**Draft — pending client confirmation on 3 open questions (see §1).** Everything marked
`[CONFIGURABLE]` below is intentionally built as a toggle/setting, not a hardcoded decision,
so the client's answers slot in without a rebuild. Do not hardcode any of §1's answers into
the schema or logic — read them from config/enum values instead.

---

## 1. Open questions — answer before final schema lock

1. **Scope** — Is this staffing/recruiting procurement only (employers sourcing agencies
   already on Caliber), or general vendor procurement (any category)?
   → Governs whether "vendor" = recruiter role only, or a new standalone vendor account type.
2. **Vendor pool** — Can only Caliber-registered recruiters/agencies respond, or can
   employers invite outside companies by email who aren't on the platform?
   → Governs whether we need invite-token/guest-response auth in addition to normal login.
3. **Formality level** — Lightweight comparison only, or full tender-grade (sealed bids,
   audit trail, disclosure rules)?
   → Governs whether sealed-bid visibility logic and immutable audit logging are in v1 or deferred.

**Build accordingly:** design all three as config now (§6), implement the lightweight path
first, leave the stricter paths stubbed but wired into the same schema.

---

## 2. Product positioning (already decided — do not revisit without client sign-off)

- **Shared underneath:** one NextAuth account, one CockroachDB/Supabase project. An employer
  logs in once and can access both Jobs and Procurement. No duplicate auth/account system.
- **Separate on top:** Procurement gets its own top-level nav item, its own landing page,
  its own dashboard section. It is **not** a tab inside the existing jobs employer dashboard.
  Equal billing, separate presentation — same pattern as LinkedIn Jobs vs. Learning vs. Sales
  Navigator on one account.
- **SEO isolation:** job pages, RSS/Atom/JSON feeds, and JobPosting JSON-LD stay 100%
  job-focused and untouched. Procurement gets its own route namespace and its own sitemap
  section so it never competes with or dilutes the job board's existing search equity.
- **Spin-off-ready:** because auth/account is shared but the product surface is separate,
  Procurement can later be split into its own subdomain/app (same pattern already used for
  `market-intel/` in this repo) without a rebuild, if it grows into its own thing.

---

## 3. Design principle: generic RFx engine, not a staffing feature

RFI, RFQ, RFP, and Tender are **not** four separate features. They are one
request → invite → respond → compare → award pipeline, differentiated only by a small set
of **strictness settings**. Build one engine; the four types are config values on it.

| Setting | RFI | RFQ | RFP | Tender |
|---|---|---|---|---|
| Pricing required in response | No | Yes | Yes | Yes |
| Solution/methodology required | No | No | Yes | Yes |
| Bids sealed from other vendors until deadline | No | Optional | Optional | Usually yes |
| Formal document upload required | No | Optional | Yes | Yes |
| Prequalification gate before invite | No | No | Optional | Usually yes |

Adding a fifth request type later (e.g. "RFS — Request for Solution") should be possible by
adding one config row, not new code.

**Category-agnostic by design:** whether the request is "staffing help" or "office
furniture" is not baked into columns. Category-specific fields (headcount, timeline,
delivery address, whatever) live in a flexible spec block (§4.2), not fixed schema columns.
Staffing is simply the first category run through the engine.

---

## 4. Data model

### 4.1 Core tables

```
procurement_requests
  id
  buyer_id              -- employer account (or later: any buyer-type account)
  type                  -- enum: rfi | rfq | rfp | tender   [CONFIGURABLE strictness per type, see §6]
  category              -- freeform/dropdown tag, e.g. "staffing", "software", "construction"
  title
  description
  spec_fields           -- JSONB: flexible per-category custom fields (see §4.2)
  status                -- draft | published | closed_for_responses | evaluating | awarded | cancelled
  visibility             -- open (anyone can respond) | invite_only
  sealed_bids           -- boolean  [CONFIGURABLE, default false — flips true for tender-grade]
  requires_prequalification -- boolean [CONFIGURABLE]
  response_deadline
  created_at / updated_at / published_at / awarded_at

procurement_invitations
  id
  request_id            -- FK -> procurement_requests
  vendor_id             -- FK -> vendor account (nullable if...)
  invited_email          -- for outside-vendor-by-email path (§1 Q2), nullable if vendor_id set
  invite_token           -- for guest/email-invited responders, nullable if vendor_id set
  status                -- invited | viewed | responded | declined
  invited_at / responded_at

procurement_responses
  id
  request_id            -- FK -> procurement_requests
  vendor_id             -- FK -> vendor account, nullable for guest responders
  invitation_id          -- FK -> procurement_invitations, nullable if open/public request
  pricing                -- JSONB or dedicated columns depending on category needs
  proposal_text
  proposal_document_url  -- object storage reference (see §5)
  submitted_at
  is_withdrawn

procurement_evaluations
  id
  request_id
  response_id
  evaluator_id           -- buyer-side user doing the scoring
  score                  -- numeric or structured JSONB (multi-criteria)
  notes
  created_at

procurement_audit_log      -- [CONFIGURABLE — required for tender-grade, optional otherwise, §6]
  id
  request_id
  actor_id
  action                  -- viewed | edited | submitted | invited | awarded | etc.
  occurred_at
  metadata               -- JSONB, e.g. IP/user-agent if needed for compliance later
```

### 4.2 `spec_fields` and category extensibility

`spec_fields` is a JSONB column holding an array of `{ label, value, field_type }` entries
defined per request by the buyer at creation time. A `procurement_category_templates` table
(optional, can ship v1.1) can predefine common field sets per category (e.g. a "staffing"
template pre-fills headcount/roles/timeline fields) so buyers aren't starting from a blank
form every time — but the underlying request table never needs new columns for new categories.

### 4.3 Vendor account model — depends on §1 Q1/Q2 answer

- If staffing-only + Caliber-registered-only: `vendor_id` above simply references the
  existing `recruiter_accounts` table. No new account type needed.
- If broader scope or outside-vendor invites: introduce a neutral `vendor_accounts` table
  (or a `role` value on a shared accounts table) so a vendor isn't assumed to be a recruiter.
  Build this table now even if v1 only populates it from recruiter accounts — it's the
  difference between a one-time schema decision and a later migration.

---

## 5. New infrastructure required (not present in current stack)

- **File storage** for spec documents and proposal uploads — Supabase Storage (same
  project, least new surface area) or S3. Nothing in the current stack handles file uploads
  today; this is net-new.
- **Deadline automation** — a scheduled job (reuse the existing GitHub Actions cron pattern
  already running the job scraper every 12h) to auto-transition `published` →
  `closed_for_responses` when `response_deadline` passes, mirroring how the sweeper
  auto-deactivates dead job listings.
- **Notifications** — reuse the existing Resend transactional email pipeline for: request
  published, invitation received, response submitted, deadline approaching, award decision.

---

## 6. Configuration layer (where §1's answers land)

Ship a single config source (env var, DB config table, or feature-flag table — pick
whichever matches how the rest of the app already does config) controlling:

```
PROCUREMENT_VENDOR_SCOPE        = "recruiters_only" | "open_vendor_accounts"
PROCUREMENT_ALLOW_EMAIL_INVITE  = true | false
PROCUREMENT_DEFAULT_SEALED_BIDS = true | false
PROCUREMENT_REQUIRE_AUDIT_LOG   = true | false
```

Every downstream feature (invitation form, vendor visibility rules, audit logging
middleware) reads these instead of assuming an answer. This is what lets the client change
their mind post-launch without a rebuild.

---

## 7. Route / IA structure (per §2 — separate surface, shared account)

```
/procurement                      -- landing page, own hero/positioning, own SEO metadata
/procurement/requests             -- buyer's list of RFx requests (own dashboard section)
/procurement/requests/new         -- create flow (type + category + spec_fields builder)
/procurement/requests/[id]        -- request detail, responses, evaluation view (buyer side)
/procurement/vendor                -- vendor-facing: invitations received, respond flow
/procurement/vendor/requests/[id]  -- vendor's response submission page
/sitemap-procurement.xml           -- separate from the existing job sitemap
```

No routes nested under `/dashboard/*` (the existing employer jobs dashboard) or `/jobs/*`.
Nav bar gets a new top-level "Procurement" item alongside Jobs, not a sub-tab.

---

## 8. Security — build in from commit one

Given this repo's own `leaks.md` history (RLS missed on 3 tables until an audit caught it),
every new table above ships with:
- RLS enabled immediately, zero default policies (deny-by-default for `anon`/`authenticated`).
- All access through the existing server-side service-role client pattern — no client-side
  DB calls, same as the rest of the app.
- Ownership scoping at the query level (`.eq('buyer_id', ...)`, `.eq('vendor_id', ...)`) on
  every read/write, following the exact pattern already verified correct in
  `lib/jobs/*-actions.ts` per `AUDIT.md`.
- If `PROCUREMENT_REQUIRE_AUDIT_LOG` is true, every view/edit/submit on a sealed-bid request
  writes to `procurement_audit_log` — this table should exist in the schema from day one
  even if writes to it are conditionally skipped in the lightweight config.

---

## 9. Phased build order

1. **Phase 1 — core engine, lightweight config only:** `procurement_requests`,
   `procurement_invitations`, `procurement_responses`, RLS on all, basic create/invite/
   respond/compare flow, recruiters-only vendor pool, no sealed bids, no audit log writes.
2. **Phase 2 — file uploads + notifications:** proposal documents, Resend emails, deadline
   cron job.
3. **Phase 3 — evaluation/scoring:** `procurement_evaluations`, comparison UI, award flow.
4. **Phase 4 — formality toggles:** sealed bids, audit logging, prequalification gating,
   outside-vendor email invites — activated per §1's actual answers.
5. **Phase 5 (future, not now):** category templates, vendor account type generalization
   beyond recruiters, possible subdomain spin-off per §2.

Do not build Phase 4 mechanics speculatively beyond the schema stubs in §4/§6 — wait for
the client's actual answers so effort isn't spent on the wrong branch.
