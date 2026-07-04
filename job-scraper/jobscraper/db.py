"""Thin CockroachDB SQL client (cut over from the previous Supabase
PostgREST client - same upsert-by-apply_url dedup semantics, same
is_active sweep pattern, just talking directly to CockroachDB over the
Postgres wire protocol instead of an HTTP REST layer, since CockroachDB
has no PostgREST-equivalent built in).
"""

import logging
from datetime import datetime, timezone
from typing import Iterable

import certifi
import psycopg2
import psycopg2.extras

from jobscraper import config

logger = logging.getLogger(__name__)

UPSERT_BATCH_SIZE = 200


def get_connection():
    config.require_database()
    # verify-full needs an explicit CA bundle on Windows - libpq/OpenSSL
    # don't reliably find the default root cert path there. certifi ships
    # the same Mozilla trusted-root list under a portable path.
    return psycopg2.connect(config.COCKROACH_DATABASE_URL, sslrootcert=certifi.where())


def _dedupe_by_apply_url(jobs: list[dict]) -> list[dict]:
    """A single multi-row INSERT ... ON CONFLICT can't affect the same
    conflict-key row twice in one statement (Postgres/CockroachDB both
    enforce this) - dedupe within each batch first. Last one wins.
    """
    deduped: dict[str, dict] = {}
    skipped = 0
    for job in jobs:
        apply_url = job.get("apply_url")
        if apply_url in deduped:
            skipped += 1
        deduped[apply_url] = job
    if skipped:
        logger.info("upsert: deduped %d jobs sharing an apply_url with another job", skipped)
    return list(deduped.values())


def _normalize_keys(jobs: list[dict]) -> tuple[list[dict], list[str]]:
    """Every job dict in one batch needs the same key set for a single
    multi-row INSERT statement - different sources produce dicts with
    different optional fields (e.g. only Adzuna sets salary_min/salary_max).
    Fill every job out to the same key set first. Returns the normalized
    rows plus the resulting column list (every key here is a real job
    field the scraper actually sets - never an unknown column - so it's
    safe to use directly as a SQL column list).
    """
    all_keys: set[str] = set()
    for job in jobs:
        all_keys.update(job.keys())
    columns = sorted(all_keys)
    return [{key: job.get(key) for key in columns} for job in jobs], columns


def upsert_jobs(jobs: list[dict]) -> int:
    """Upsert jobs, deduping on the `apply_url` unique index.

    Re-running never creates duplicates - it refreshes every column present
    in the batch. Columns never present in any job dict (id, created_at,
    visa_sponsorship, etc.) are left alone on conflict and take their table
    default on insert - matches the old PostgREST merge-duplicates behavior
    exactly (it only ever touched columns present in the JSON body too).
    """
    if not jobs:
        return 0

    deduped = _dedupe_by_apply_url(jobs)

    written = 0
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for i in range(0, len(deduped), UPSERT_BATCH_SIZE):
                batch = deduped[i : i + UPSERT_BATCH_SIZE]
                normalized, columns = _normalize_keys(batch)
                if "apply_url" not in columns:
                    continue  # keep_valid() upstream should already guarantee this

                col_list = ", ".join(columns)
                update_clause = ", ".join(
                    f"{c} = excluded.{c}" for c in columns if c != "apply_url"
                )
                values = [tuple(job.get(c) for c in columns) for job in normalized]

                sql = (
                    f"insert into public.jobs ({col_list}) values %s "
                    f"on conflict (apply_url) do update set {update_clause}"
                )
                try:
                    psycopg2.extras.execute_values(cur, sql, values)
                    conn.commit()
                    written += len(batch)
                except Exception:
                    conn.rollback()
                    logger.exception("Upsert batch failed (rows %d-%d)", i, i + len(batch))
                    continue
    finally:
        conn.close()
    return written


def fetch_active_jobs() -> list[dict]:
    """Fetch every active job's id/apply_url/source for the sweeper - a
    single query (no PostgREST-style pagination needed; that was only ever
    working around PostgREST's default 1000-row response cap, which
    doesn't apply to a direct SQL query).
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("select id, apply_url, source from public.jobs where is_active = true")
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def mark_discontinued(job_ids: Iterable[str]) -> int:
    """Mark jobs inactive (acquired/expired/removed by the source) in one
    batched UPDATE, rather than one request per job like the old PATCH-per-id
    PostgREST version did.
    """
    ids = list(job_ids)
    if not ids:
        return 0

    now = datetime.now(timezone.utc)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "update public.jobs set is_active = false, discontinued_at = %s "
                "where id = any(%s)",
                (now, ids),
            )
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()
