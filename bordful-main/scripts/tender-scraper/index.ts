// Tender scraper runner.
// Usage: npx tsx scripts/tender-scraper/index.ts

import dotenv from 'dotenv';
import { resolve } from 'path';
// Same env-loading convention as scripts/scraper/index.ts: CI injects
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY directly, local runs fall back to
// job-scraper/.env then .env.local.
dotenv.config({ path: resolve(process.cwd(), '../job-scraper/.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { deactivateExpiredTenders, upsertTender } from './db';
import { scrapeTed } from './sources/ted';
import { scrapePpra } from './sources/ppra';

const SOURCES: { name: string; scrape: () => Promise<import('./types').ScrapedTender[]> }[] = [
  { name: 'ted', scrape: scrapeTed },
  { name: 'ppra', scrape: scrapePpra },
];

async function main() {
  console.log(`\n=== Caliber Tender Scraper — ${new Date().toISOString()} ===`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const { name, scrape } of SOURCES) {
    try {
      const tenders = await scrape();
      console.log(`[${name}] Fetched ${tenders.length} notices`);

      for (const tender of tenders) {
        try {
          const result = await upsertTender(tender);
          if (result === 'inserted') inserted++;
          else updated++;
        } catch (e) {
          errors++;
          console.error(`[${name}] DB error for "${tender.title}":`, (e as Error).message);
        }
      }
    } catch (e) {
      errors++;
      console.error(`[${name}] Source failed:`, (e as Error).message);
    }
  }

  const deactivated = await deactivateExpiredTenders();

  console.log(
    `Done — inserted: ${inserted}, updated: ${updated}, deactivated: ${deactivated}, errors: ${errors}`
  );
  if (errors > 0) process.exitCode = 1;
}

main();
