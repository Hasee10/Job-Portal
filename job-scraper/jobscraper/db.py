"""Thin Supabase REST (PostgREST) client - no supabase-py dependency needed.

Mirrors exactly what the old n8n workflows did over HTTP: upsert jobs keyed
on the `apply_url` unique index, and PATCH `is_active=false` for dead links.
"""

import logging
from datetime import datetime, timezone
from typing import Iterable

import httpx

from jobscraper import config

logger = logging.getLogger(__name__)

UPSERT_BATCH_SIZE = 200


def _headers(extra: dict | None = None) -> dict:
    headers = {
        "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def _dedupe_by_apply_url(jobs: list[dict]) -> list[dict]:
    """PostgREST's bulk upsert runs as a single INSERT...ON CONFLICT DO
    UPDATE statement per batch - Postgres rejects that outright if the same
    batch tries to touch the same conflict key (apply_url) twice ("ON
    CONFLICT DO UPDATE command cannot affect row a second time"), which was
    silently dropping ~200 rows at a time whenever two sources (or the same
    source twice) produced the same apply_url. Last one wins.
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


def _normalize_keys(jobs: list[dict]) -> list[dict]:
    """PostgREST's bulk insert requires every object in the same request to
    have identical keys ("All object keys must match", PGRST102) - different
    sources produce dicts with different optional fields (e.g. only Adzuna
    sets salary_min/salary_max), which was silently failing whole batches
    that mixed sources. Fill every job out to the same key set first.
    """
    all_keys: set[str] = set()
    for job in jobs:
        all_keys.update(job.keys())
    return [{key: job.get(key) for key in all_keys} for job in jobs]


def upsert_jobs(jobs: list[dict]) -> int:
    """Upsert jobs, deduping on the `apply_url` unique index.

    Re-running never creates duplicates - it refreshes the row (including a
    fresh score/posted_at) via `resolution=merge-duplicates`.
    """
    if not jobs:
        return 0

    jobs = _normalize_keys(_dedupe_by_apply_url(jobs))

    config.require_supabase()
    url = f"{config.SUPABASE_URL}/rest/v1/jobs?on_conflict=apply_url"
    headers = _headers({"Prefer": "resolution=merge-duplicates,return=minimal"})

    written = 0
    with httpx.Client(timeout=config.HTTP_TIMEOUT) as client:
        for i in range(0, len(jobs), UPSERT_BATCH_SIZE):
            batch = jobs[i : i + UPSERT_BATCH_SIZE]
            resp = client.post(url, headers=headers, json=batch)
            if resp.status_code >= 300:
                logger.error(
                    "Upsert batch failed (%s): %s", resp.status_code, resp.text[:500]
                )
                continue
            written += len(batch)
    return written


FETCH_PAGE_SIZE = 1000


def fetch_active_jobs() -> list[dict]:
    """Fetch every active job, paginated.

    PostgREST caps a single response at 1000 rows by default - without
    pagination this would silently only ever sweep the first 1000 active
    jobs and leave everything past that permanently unchecked.
    """
    config.require_supabase()
    url = f"{config.SUPABASE_URL}/rest/v1/jobs?select=id,apply_url&is_active=eq.true"

    jobs: list[dict] = []
    offset = 0
    with httpx.Client(timeout=config.HTTP_TIMEOUT) as client:
        while True:
            headers = _headers(
                {"Range-Unit": "items", "Range": f"{offset}-{offset + FETCH_PAGE_SIZE - 1}"}
            )
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            page = resp.json()
            jobs.extend(page)
            if len(page) < FETCH_PAGE_SIZE:
                break
            offset += FETCH_PAGE_SIZE
    return jobs


def mark_discontinued(job_ids: Iterable[str]) -> int:
    """Mark jobs inactive (acquired/expired/removed by the source)."""
    ids = list(job_ids)
    if not ids:
        return 0

    config.require_supabase()
    marked = 0
    now = datetime.now(timezone.utc).isoformat()
    with httpx.Client(timeout=config.HTTP_TIMEOUT) as client:
        for job_id in ids:
            url = f"{config.SUPABASE_URL}/rest/v1/jobs?id=eq.{job_id}"
            resp = client.patch(
                url,
                headers=_headers({"Prefer": "return=minimal"}),
                json={"is_active": False, "discontinued_at": now},
            )
            if resp.status_code >= 300:
                logger.error(
                    "Failed to mark %s discontinued (%s): %s",
                    job_id,
                    resp.status_code,
                    resp.text[:300],
                )
                continue
            marked += 1
    return marked
