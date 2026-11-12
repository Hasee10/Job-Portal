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
