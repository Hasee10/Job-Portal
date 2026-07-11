// Main scraper runner.
// Usage: bun scripts/scraper/index.ts [source]
// Examples:
//   bun scripts/scraper/index.ts              — run all sources
//   bun scripts/scraper/index.ts rss          — RSS feeds only
//   bun scripts/scraper/index.ts mustakbil    — Mustakbil only
//   bun scripts/scraper/index.ts naukrigulf   — NaukriGulf only

import dotenv from 'dotenv';
import { resolve } from 'path';
// In CI, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected directly.
// Locally: load job-scraper/.env (has Supabase keys) then .env.local as fallback.
dotenv.config({ path: resolve(process.cwd(), '../job-scraper/.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
import { closePool, upsertJob } from './db';
import { RSS_SOURCES, scrapeRss } from './sources/rss';
import { scrapeMustakbil } from './sources/mustakbil';
import { scrapeNaukriGulf } from './sources/naukrigulf';
import type { ScrapedJob } from './types';

const CONCURRENCY = 1; // insert jobs one at a time; DB is remote, be gentle

async function ingest(jobs: ScrapedJob[], label: string): Promise<void> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const job of jobs) {
    try {
      const result = await upsertJob(job);
      if (result === 'inserted') inserted++;
      else if (result === 'updated') updated++;
      else skipped++;
    } catch (e) {
      errors++;
      console.error(`[${label}] DB error for "${job.title}":`, (e as Error).message);
    }
  }

  console.log(`[${label}] Done — inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}, errors: ${errors}`);
}

async function main() {
  const filter = process.argv[2]?.toLowerCase();

  const startTime = Date.now();
  console.log(`\n=== Joblo Scraper — ${new Date().toISOString()} ===`);
  if (filter) console.log(`Running source filter: "${filter}"`);

  try {
    // ── RSS feeds ──────────────────────────────────────────────────────────
    if (!filter || filter === 'rss') {
      for (const source of RSS_SOURCES) {
        try {
          const jobs = await scrapeRss(source);
          await ingest(jobs, source.name);
        } catch (e) {
          console.error(`[${source.name}] Source failed:`, (e as Error).message);
        }
      }
    }

    // ── Mustakbil.com ──────────────────────────────────────────────────────
    if (!filter || filter === 'mustakbil') {
      try {
        const jobs = await scrapeMustakbil();
        await ingest(jobs, 'mustakbil');
      } catch (e) {
        console.error('[mustakbil] Source failed:', (e as Error).message);
      }
    }

    // ── NaukriGulf.com ─────────────────────────────────────────────────────
    if (!filter || filter === 'naukrigulf') {
      try {
        const jobs = await scrapeNaukriGulf();
        await ingest(jobs, 'naukrigulf');
      } catch (e) {
        console.error('[naukrigulf] Source failed:', (e as Error).message);
      }
    }

  } finally {
    await closePool();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Completed in ${elapsed}s ===\n`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
