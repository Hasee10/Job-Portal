// Tender scraper runner.
// Usage: npx tsx scripts/tender-scraper/index.ts

import dotenv from "dotenv";
import { resolve } from "path";

// Same env-loading convention as scripts/scraper/index.ts: CI injects
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY directly, local runs fall back to
// job-scraper/.env then .env.local.
dotenv.config({ path: resolve(process.cwd(), "../job-scraper/.env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import {
  deactivateExpiredTenders,
  deactivateStaleUndatedTenders,
  upsertTender,
} from "./db";
import { scrapeBahrain } from "./sources/bahrain";
import { scrapePpra } from "./sources/ppra";
import { scrapeTed } from "./sources/ted";
import type { ScrapedTender } from "./types";

// Smallest/fastest sources first: this used to be ted-then-ppra, but ted
// alone can return several thousand notices, and upserting those one at a
// time (see UPSERT_CONCURRENCY below) was slow enough to hit this
// workflow's 20-minute CI timeout - when it did, ted being first meant
// whatever ran after it never got to execute at all. Ordering by ascending
// volume means a slow source timing out can no longer starve the others
// out of every run.
const SOURCES: {
  name: string;
  scrape: () => Promise<ScrapedTender[]>;
}[] = [
  { name: "ppra", scrape: scrapePpra },
  { name: "bahrain", scrape: scrapeBahrain },
  { name: "ted", scrape: scrapeTed },
];

// One tender at a time (await in a loop) was the other half of the timeout
// problem above: each upsert is a SELECT-then-INSERT/UPDATE round trip to
// Supabase, and awaiting ~3,000 of those sequentially took 20+ minutes on
// its own. These are independent writes to different rows (no shared state,
// no ordering requirement between them), so batching them concurrently is
// safe and cuts that same run to a couple of minutes.
const UPSERT_CONCURRENCY = 10;

async function upsertAll(
  name: string,
  tenders: ScrapedTender[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < tenders.length; i += UPSERT_CONCURRENCY) {
    const batch = tenders.slice(i, i + UPSERT_CONCURRENCY);
    // Bounded concurrency, not a sequential wait: each batch's upserts run
    // together, and only the next batch's await is in series with this one.
    // biome-ignore lint/performance/noAwaitInLoops: intentional - see UPSERT_CONCURRENCY's comment above
    const results = await Promise.allSettled(
      batch.map((tender) => upsertTender(tender))
    );
    for (let j = 0; j < results.length; j += 1) {
      const result = results[j];
      if (result.status === "fulfilled") {
        if (result.value === "inserted") {
          inserted += 1;
        } else {
          updated += 1;
        }
      } else {
        errors += 1;
        console.error(
          `[${name}] DB error for "${batch[j].title}":`,
          (result.reason as Error).message
        );
      }
    }
  }

  return { errors, inserted, updated };
}

async function main() {
  console.log(`\n=== Caliber Tender Scraper — ${new Date().toISOString()} ===`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const { name, scrape } of SOURCES) {
    try {
      const tenders = await scrape();
      console.log(`[${name}] Fetched ${tenders.length} notices`);

      const result = await upsertAll(name, tenders);
      inserted += result.inserted;
      updated += result.updated;
      errors += result.errors;
    } catch (e) {
      errors++;
      console.error(`[${name}] Source failed:`, (e as Error).message);
    }
  }

  const deactivated =
    (await deactivateExpiredTenders()) +
    (await deactivateStaleUndatedTenders());

  console.log(
    `Done — inserted: ${inserted}, updated: ${updated}, deactivated: ${deactivated}, errors: ${errors}`
  );
  if (errors > 0) {
    process.exitCode = 1;
  }
}

main();
