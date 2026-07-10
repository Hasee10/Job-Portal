import { Pool } from 'pg';
import type { ScrapedJob } from './types';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    // COCKROACH_WRITER_URL takes priority (write-capable user).
    // Falls back to COCKROACH_DATABASE_URL for environments that only set one var.
    const url = process.env.COCKROACH_WRITER_URL ?? process.env.COCKROACH_DATABASE_URL;
    if (!url) throw new Error('Neither COCKROACH_WRITER_URL nor COCKROACH_DATABASE_URL is set');
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: true }, max: 5 });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Upsert a scraped job.
// Strategy: check by (source, job_identifier) first — if found, update core
// display fields but leave featured/career_level/visa_sponsorship untouched
// (those may have been manually curated). If not found, insert fresh.
export async function upsertJob(job: ScrapedJob): Promise<'inserted' | 'updated' | 'skipped'> {
  const db = getPool();

  // 1. Look for an existing row from the same source
  const existing = await db.query<{ id: string }>(
    'SELECT id FROM public.jobs WHERE source = $1 AND job_identifier = $2 LIMIT 1',
    [job.source, job.job_identifier]
  );

  if (existing.rows.length > 0) {
    // Update only the fields the scraper provides — don't overwrite manual curation
    await db.query(
      `UPDATE public.jobs SET
        title            = $1,
        company          = $2,
        apply_url        = $3,
        description      = COALESCE($4, description),
        type             = COALESCE($5, type),
        remote_type      = COALESCE($6, remote_type),
        workplace_city   = COALESCE($7, workplace_city),
        workplace_country = COALESCE($8, workplace_country),
        salary_min       = COALESCE($9, salary_min),
        salary_max       = COALESCE($10, salary_max),
        salary_currency  = COALESCE($11, salary_currency, 'USD'),
        salary_unit      = COALESCE($12, salary_unit, 'year'),
        posted_at        = COALESCE($13, posted_at),
        valid_through    = COALESCE($14, valid_through),
        is_active        = true
      WHERE source = $15 AND job_identifier = $16`,
      [
        job.title, job.company, job.apply_url,
        job.description ?? null,
        job.type ?? null,
        job.remote_type ?? null,
        job.workplace_city ?? null,
        job.workplace_country ?? null,
        job.salary_min ?? null,
        job.salary_max ?? null,
        job.salary_currency ?? null,
        job.salary_unit ?? null,
        job.posted_at ?? null,
        job.valid_through ?? null,
        job.source, job.job_identifier,
      ]
    );
    return 'updated';
  }

  // 2. Check if the same apply_url already exists from any source (avoid duplicates)
  const urlConflict = await db.query<{ id: string }>(
    'SELECT id FROM public.jobs WHERE apply_url = $1 LIMIT 1',
    [job.apply_url]
  );
  if (urlConflict.rows.length > 0) {
    return 'skipped';
  }

  // 3. Fresh insert
  await db.query(
    `INSERT INTO public.jobs (
      id, title, company, apply_url, source, job_identifier,
      description, type, remote_type, workplace_city, workplace_country,
      salary_min, salary_max, salary_currency, salary_unit,
      posted_at, valid_through, is_active, featured,
      visa_sponsorship, career_level, languages, remote_region
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, COALESCE($13, 'USD'), COALESCE($14, 'year'),
      $15, $16, true, false,
      'Not specified', '{}', '{}', 'Worldwide'
    )`,
    [
      job.title, job.company, job.apply_url, job.source, job.job_identifier,
      job.description ?? null,
      job.type ?? 'Full-time',
      job.remote_type ?? 'onsite',
      job.workplace_city ?? null,
      job.workplace_country ?? null,
      job.salary_min ?? null,
      job.salary_max ?? null,
      job.salary_currency ?? null,
      job.salary_unit ?? null,
      job.posted_at ?? new Date(),
      job.valid_through ?? null,
    ]
  );
  return 'inserted';
}
