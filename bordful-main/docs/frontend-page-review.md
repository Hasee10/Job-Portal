# Caliber page consistency review

**Authentication follow-up:** Localhost preview shortcuts have since been removed. Jobs requires sign-in, anonymous organizations requests go to business sign-in, and the retired preview URL redirects through organizations. The coverage table below records the earlier visual review conditions.

Reviewed all 72 page templates in source for shared header, palette and component usage. Browser coverage includes all 50 non-parameter paths, plus representative Jobs filters/details, a guide article and a business profile. These checks used local fictional data and no authenticated production session.

## What changed

- Shared light/dark forest, sage and lime tokens replace the legacy primary blue. Neutral text and semantic success/warning/error/status colours retain their meaning. Third-party sign-in logos are preserved.
- Shared page headers now use a responsive sage introduction rather than the old gradient/global stock-photo fallback. This covers About, FAQ, pricing, alerts, Jobs taxonomy and search routes.
- FAQ now has help-topic navigation, customer-facing Jobs and Procurement answers, grouped accordions and a correct Contact link. Search, query clearing, answer expansion and topic anchors were checked.
- About copy now explains the actual two-pillar product rather than making unsupported company-history/team claims. Release notes use the shared header and readable document layout.
- Navigation/footer, sign-in/onboarding, learning content, directory/profile, local workspace preview and controls share the same brand palette. Primary badges/buttons and older muted labels have dark-mode contrast corrections.

## Coverage and limits

An anonymous redirect verifies only the entry route/access boundary, not the private workspace behind it. The opted-in localhost preview is fictional and does not authenticate. The local /recruiters route cannot load its legacy datasource; this is recorded as an environment blocker, not presented as a verified production defect. No schema or credential changes were made.

| Page template | Browser coverage |
| --- | --- |
| `/` | HTTP 200; page rendered |
| `/about` | HTTP 200; page rendered |
| `/account` | Entry route checked → `/jobs`; protected content not reviewed |
| `/account/inbox` | Entry route checked → `/jobs`; protected content not reviewed |
| `/account/onboarding` | Entry route checked → `/jobs`; protected content not reviewed |
| `/account/resume` | Entry route checked → `/jobs`; protected content not reviewed |
| `/account/sign-in` | Entry route checked → `/jobs`; protected content not reviewed |
| `/changelog` | HTTP 200; page rendered |
| `/contact` | HTTP 200; page rendered |
| `/dashboard` | Entry route checked → `/sign-in`; protected content not reviewed |
| `/dashboard/jobs` | Entry route checked → `/sign-in`; protected content not reviewed |
| `/dashboard/jobs/[id]/applications` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/dashboard/jobs/[id]/candidates` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/dashboard/jobs/[id]/edit` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/dashboard/jobs/new` | Entry route checked → `/sign-in`; protected content not reviewed |
| `/dashboard/profile` | Entry route checked → `/sign-in`; protected content not reviewed |
| `/faq` | HTTP 200; page rendered |
| `/forgot-password` | HTTP 200; page rendered |
| `/guides` | HTTP 200; page rendered |
| `/guides/[slug]` | HTTP 200; representative detail/filter |
| `/job-alerts` | HTTP 200; page rendered |
| `/jobs` | HTTP 200; page rendered |
| `/jobs/[slug]` | HTTP 200; representative detail/filter |
| `/jobs/language/[language]` | HTTP 200; representative detail/filter |
| `/jobs/languages` | HTTP 200; page rendered |
| `/jobs/level/[level]` | HTTP 200; representative detail/filter |
| `/jobs/levels` | HTTP 200; page rendered |
| `/jobs/location/[location]` | HTTP 200; representative detail/filter |
| `/jobs/locations` | HTTP 200; page rendered |
| `/jobs/type/[type]` | HTTP 200; representative detail/filter |
| `/jobs/types` | HTTP 200; page rendered |
| `/join` | HTTP 200; page rendered |
| `/masterclasses` | HTTP 200; page rendered |
| `/pricing` | HTTP 200; page rendered |
| `/privacy` | HTTP 200; page rendered |
| `/procurement` | HTTP 200; page rendered |
| `/procurement/directory` | HTTP 200; page rendered |
| `/procurement/directory/[id]` | HTTP 200; representative detail/filter |
| `/procurement/invitations` | Entry route checked → `/sign-in`; protected content not reviewed |
| `/procurement/organizations` | Entry route checked → `/procurement/preview`; protected content not reviewed |
| `/procurement/organizations/[id]` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/procurement/organizations/[id]/connections/[connectionId]` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/procurement/organizations/[id]/opportunities` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/procurement/organizations/[id]/opportunities/[requestId]` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/procurement/organizations/[id]/requests` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/procurement/organizations/[id]/requests/[requestId]` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/procurement/preview` | HTTP 200; page rendered |
| `/procurement/requests` | Entry route checked → `/sign-in`; protected content not reviewed |
| `/procurement/requests/[id]` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/procurement/requests/new` | Entry route checked → `/sign-in`; protected content not reviewed |
| `/procurement/tenders` | HTTP 200; page rendered |
| `/procurement/vendor` | Entry route checked → `/sign-in`; protected content not reviewed |
| `/procurement/vendor/requests/[id]` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/procurement/vendors` | HTTP 200; page rendered |
| `/recruiter/dashboard` | Entry route checked → `/recruiter/sign-in`; protected content not reviewed |
| `/recruiter/forgot-password` | HTTP 200; page rendered |
| `/recruiter/jobs` | Entry route checked → `/recruiter/sign-in`; protected content not reviewed |
| `/recruiter/jobs/[id]/applications` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/recruiter/jobs/[id]/candidates` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/recruiter/jobs/[id]/edit` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/recruiter/jobs/new` | Entry route checked → `/recruiter/sign-in`; protected content not reviewed |
| `/recruiter/pipeline` | Entry route checked → `/recruiter/sign-in`; protected content not reviewed |
| `/recruiter/profile/[id]` | Source and shared styles reviewed; private/data-specific content not rendered |
| `/recruiter/profile/edit` | Entry route checked → `/recruiter/sign-in`; protected content not reviewed |
| `/recruiter/reset-password` | HTTP 200; page rendered |
| `/recruiter/sign-in` | HTTP 200; page rendered |
| `/recruiter/sign-up` | HTTP 200; page rendered |
| `/recruiters` | Local legacy datasource unavailable; shared error boundary displayed |
| `/reset-password` | HTTP 200; page rendered |
| `/sign-in` | Entry route checked → `/procurement/preview`; protected content not reviewed |
| `/sign-up` | HTTP 200; page rendered |
| `/terms` | HTTP 200; page rendered |

## Verification

22 focused landing, navigation, account and application-destination tests passed. FAQ interaction checks passed. Representative light/dark axe A/AA checks passed on the sampled public page families after contrast fixes, including a sample job detail. Phone overflow checks passed on the sampled public page families. These automated checks are not a full manual accessibility audit.
