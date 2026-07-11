"""Supabase PostgREST client — switched back from CockroachDB (hit RU limit).

Uses the REST API via httpx so no postgres driver or SSL cert path is needed.
All write operations use the service role key which bypasses RLS.
"""

import logging
from datetime import datetime, timezone
from typing import Iterable

import httpx

from jobscraper import config

logger = logging.getLogger(__name__)

UPSERT_BATCH_SIZE = 200


def _headers(*, content_type: bool = True) -> dict:
    h = {
        "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
    }
    if content_type:
        h["Content-Type"] = "application/json"
    return h


def _rest(path: str) -> str:
    return f"{config.SUPABASE_URL}/rest/v1/{path}"


def _dedupe_by_apply_url(jobs: list[dict]) -> list[dict]:
    deduped: dict[str, dict] = {}
    skipped = 0
    for job in jobs:
        url = job.get("apply_url")
        if url in deduped:
            skipped += 1
        deduped[url] = job
    if skipped:
        logger.info("upsert: deduped %d jobs sharing an apply_url", skipped)
    return list(deduped.values())


def upsert_jobs(jobs: list[dict]) -> int:
    """Upsert jobs deduping on apply_url unique index."""
    if not jobs:
        return 0

    config.require_database()
    deduped = _dedupe_by_apply_url(jobs)
    written = 0

    with httpx.Client(timeout=30) as client:
        for i in range(0, len(deduped), UPSERT_BATCH_SIZE):
            batch = deduped[i : i + UPSERT_BATCH_SIZE]
            resp = client.post(
                _rest("jobs"),
                json=batch,
                headers={
                    **_headers(),
                    "Prefer": "resolution=merge-duplicates,return=minimal",
                },
            )
            if resp.status_code in (200, 201):
                written += len(batch)
            else:
                logger.error(
                    "Upsert batch %d–%d failed: %s %s",
                    i, i + len(batch), resp.status_code, resp.text[:300],
                )

    return written


def fetch_active_jobs() -> list[dict]:
    """Fetch every active job's id/apply_url/source for the sweeper.

    Supabase PostgREST caps responses at 1 000 rows by default — use the
    Range header to request a larger window (up to whatever the DB has).
    """
    config.require_database()
    all_rows: list[dict] = []
    page_size = 1000
    offset = 0

    with httpx.Client(timeout=30) as client:
        while True:
            resp = client.get(
                _rest("jobs"),
                params={"is_active": "eq.true", "select": "id,apply_url,source"},
                headers={
                    **_headers(content_type=False),
                    "Range": f"{offset}-{offset + page_size - 1}",
                    "Range-Unit": "items",
                    "Prefer": "count=none",
                },
            )
            if resp.status_code not in (200, 206):
                logger.error("fetch_active_jobs page %d failed: %s", offset, resp.status_code)
                break
            rows = resp.json()
            all_rows.extend(rows)
            if len(rows) < page_size:
                break
            offset += page_size

    return all_rows


def mark_missing_from_source(source: str, seen_apply_urls: Iterable[str]) -> int:
    """Deactivate jobs from `source` that vanished from this run's fetch."""
    seen = set(seen_apply_urls)
    if not seen:
        logger.warning(
            "mark_missing_from_source: %s returned 0 jobs — skipping to avoid mass-deactivation",
            source,
        )
        return 0

    config.require_database()

    # Fetch all active jobs from this source, then find the ones not seen
    with httpx.Client(timeout=30) as client:
        resp = client.get(
            _rest("jobs"),
            params={"source": f"eq.{source}", "is_active": "eq.true", "select": "id,apply_url"},
            headers={
                **_headers(content_type=False),
                "Range": "0-9999",
                "Range-Unit": "items",
            },
        )
        if resp.status_code not in (200, 206):
            logger.error("mark_missing_from_source fetch failed: %s", resp.status_code)
            return 0

        active = resp.json()

    missing_ids = [row["id"] for row in active if row["apply_url"] not in seen]
    if not missing_ids:
        return 0

    return mark_discontinued(missing_ids)


def mark_discontinued(job_ids: Iterable[str]) -> int:
    """Mark jobs inactive in one batched PATCH."""
    ids = list(job_ids)
    if not ids:
        return 0

    config.require_database()
    now = datetime.now(timezone.utc).isoformat()
    updated = 0

    with httpx.Client(timeout=30) as client:
        for i in range(0, len(ids), 500):
            batch = ids[i : i + 500]
            id_list = "(" + ",".join(batch) + ")"
            resp = client.patch(
                _rest("jobs"),
                params={"id": f"in.{id_list}"},
                json={"is_active": False},
                headers={
                    **_headers(),
                    "Prefer": "return=minimal",
                },
            )
            if resp.status_code in (200, 204):
                updated += len(batch)
            else:
                logger.error(
                    "mark_discontinued batch %d–%d failed: %s %s",
                    i, i + len(batch), resp.status_code, resp.text[:200],
                )

    return updated
