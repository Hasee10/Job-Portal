# Local layout data

Run from `bordful-main`:

```powershell
node scripts/dev/seed-demo-data.mjs
node --test scripts/dev/demo-data.test.mjs
```

The seed command reads `.env.local`, refuses production mode and non-loopback API URLs, and upserts only stable synthetic IDs into the existing local `scraped_tenders` and `organizations` tables. It adds 500 tenders and 500 public business profiles. Re-running refreshes the same records rather than duplicating them. No schemas, accounts, memberships, bids, awards or production data are created or changed.

Because the procurement-only database intentionally has no Jobs table, 500 synthetic job rows are written to the ignored `supabase/.temp/demo-jobs.json`. Set `LOCAL_DEMO_DATA=true` in the ignored `.env.local` and start/restart the standalone gateway with `node supabase/local-rest-gateway.mjs`. It serves read-only Jobs fixtures and proxies other tables to the local database as before. The fixture adapter supports the app's existing selection, equality, ordering, pagination, exact-count and detail requests. It refuses Jobs writes. It is never imported by the production application and cannot activate with NODE_ENV=production.

The development app displays a demo banner when LOCAL_DEMO_DATA=true. Production never displays it. To stop serving synthetic Jobs, set the flag to false and restart the gateway. Seeded procurement rows remain in the local database; disabling the flag does not delete database records.

Fixtures cover four employment types, seven career levels, three workplace settings, ten cities/countries, missing salaries, featured listings, varied dates, six CPV categories, 100 PPRA / 400 TED notices, and buyer/supplier/combined business profiles. Names/descriptions are explicitly fictional, business contacts are blank, tender links use example.invalid, and jobs have no application destination or employer account.

Verified locally: exactly 500 API records in each dataset; three focused fixture/adapter tests; TypeScript check; browser rendering of job types, full-time cards, one job detail, tender pages 1/2, PPRA filtering, business directory and one public business profile. All checked routes returned 200 with no page JavaScript errors. These fixtures are for public layout testing, not for authenticated submission or award workflow testing.


## Procurement presentation

The former read-only workspace preview has been retired. `/procurement/preview` now redirects to the authenticated procurement dashboard.

For a working presentation with requests, quotations, evaluation, awards and conversations, use the isolated Windows localhost stack. It requires Node.js, installed dependencies, PostgreSQL binaries and PostgREST 16.5. Set `PRESENTATION_PG_BIN` if PostgreSQL is installed somewhere other than `D:/PostgreSQL/18/bin`.

Install the official PostgREST binary once, from `bordful-main`:

```powershell
$presentationCache = Join-Path (Get-Location) 'node_modules/.cache/procurement-presentation'
New-Item -ItemType Directory -Force -Path $presentationCache | Out-Null
Invoke-WebRequest -Uri 'https://github.com/PostgREST/postgrest/releases/download/v16.5/postgrest-v16.5-windows-x86-64.zip' -OutFile "$presentationCache/postgrest-v16.5.zip"
Expand-Archive -LiteralPath "$presentationCache/postgrest-v16.5.zip" -DestinationPath "$presentationCache/bin-v16.5" -Force
npm run dev:presentation
```

Open [the local demo](http://localhost:3000/demo). It signs in as `ihaseebarshad10@gmail.com` using a normal application session and opens the procurement dashboard. The Procurement page and mobile navigation also link to the dashboard; signed-out visitors to that dashboard are automatically sent through the local demo login. Manual credentials are stored in the ignored `.env.presentation.local` file under `PRESENTATION_PASSWORD`.

In presentation mode, `/sign-in` and `/sign-up` also enter the demo automatically. Procurement callback paths and the selected workspace/view are preserved, so existing sign-in links do not show a password form. Callbacks outside Procurement fall back to its dashboard. Production and non-loopback hosts retain normal authentication.

The dashboard restores the business workspace layout: a dark sidebar, business switcher, Overview, Requests, Connections, Messages, Quotations and Team. It reads the selected member business's real local records; request details and conversation links remain functional. Sealed quotations remain protected by the existing server actions. Use “Add another business” in the switcher to create another organization.

The launcher creates a separate PostgreSQL cluster under `node_modules/.cache/procurement-presentation/data` on port 55433, PostgREST on 55431, a REST gateway on 55432, and Next.js on port 3000. Services bind to `127.0.0.1`. It preserves `.env.local` and does not use or change the hosted database. Email delivery is disabled for the presentation process. Stop the app and API processes with Ctrl+C; the database remains available for the next presentation.

The deterministic seed creates one local login, four businesses owned by that login, 32 fictional partners, 144 requests, 296 supplier invitations, 234 quotations, 80 evaluations, 16 awards, 256 connections, 576 messages, and 12 fictional team invitations. Businesses are private, partner memberships use synthetic identities, and team addresses use `example.invalid`. Re-running the launcher refreshes the same seed records instead of duplicating them; it leaves unrelated IDs alone. The seed refuses a hosted endpoint or a conflicting existing local account.

The dashboard aggregates the signed-in member's business requests and attention counts. Organization membership and server permission checks still apply to every action. The demo endpoint and its rate-limit exception require development mode, a loopback request host, the isolated gateway URL, and the launcher's demo password. They cannot activate in production.

Run `npm run test:presentation` for deterministic data consistency and gateway recovery checks. `npm test` includes tests that reject production mode, non-loopback hosts, missing credentials and hosted database URLs for demo authentication.
