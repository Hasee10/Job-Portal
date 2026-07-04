#!/usr/bin/env python
"""Permanently deletes jobs that have been discontinued (is_active=false)
for longer than config.RETENTION_DAYS.

Why this exists: the stale-job sweeper (jobscraper/sweeper.py) only ever
sets is_active=false on a dead posting - it never deletes anything. Left
alone forever, the jobs table grows without bound even though most of that
growth is jobs nobody can apply to anymore. Supabase's free tier caps the
whole database at 500MB; this keeps long-term growth in check without
touching anything that's still active or was only recently taken down.

Usage:
    python retention_cleanup.py            # delete jobs discontinued 90+ days ago
    python retention_cleanup.py --dry-run  # show what WOULD be deleted, delete nothing
    python retention_cleanup.py --days 30  # override the retention window for this run
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx

from jobscraper import config
from jobscraper.logging_conf import setup_logging

PAGE_SIZE = 500


def _headers() -> dict:
    return {
        "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
    }


def fetch_expired_ids(client: httpx.Client, cutoff_iso: str) -> list[str]:
    """Jobs that are inactive AND were discontinued before the cutoff -
    never touches active jobs or ones without a discontinued_at yet."""
    ids: list[str] = []
    offset = 0
    url = (
        f"{config.SUPABASE_URL}/rest/v1/jobs"
        f"?select=id&is_active=eq.false&discontinued_at=lt.{quote(cutoff_iso, safe='')}"
    )
    while True:
        headers = {
            **_headers(),
            "Range-Unit": "items",
            "Range": f"{offset}-{offset + PAGE_SIZE - 1}",
        }
        resp = client.get(url, headers=headers)
        resp.raise_for_status()
        page = resp.json()
        ids.extend(row["id"] for row in page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return ids


def delete_jobs(client: httpx.Client, job_ids: list[str]) -> int:
    """Deletes in chunks via id=in.(...) rather than one request per row."""
    deleted = 0
    for i in range(0, len(job_ids), PAGE_SIZE):
        chunk = job_ids[i : i + PAGE_SIZE]
        id_list = ",".join(chunk)
        url = f"{config.SUPABASE_URL}/rest/v1/jobs?id=in.({id_list})"
        resp = client.delete(url, headers={**_headers(), "Prefer": "return=minimal"})
        if resp.status_code >= 300:
            print(f"FAILED to delete a batch of {len(chunk)}: {resp.status_code} {resp.text[:300]}")
            continue
        deleted += len(chunk)
    return deleted


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--days",
        type=int,
        default=config.RETENTION_DAYS,
        help=f"delete jobs discontinued at least this many days ago (default: {config.RETENTION_DAYS})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report how many rows would be deleted, but don't delete anything",
    )
    args = parser.parse_args()

    setup_logging()
    config.require_supabase()

    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
    cutoff_iso = cutoff.isoformat()
    print(f"Retention window: {args.days} days (cutoff: {cutoff_iso})")

    with httpx.Client(timeout=30.0) as client:
        expired_ids = fetch_expired_ids(client, cutoff_iso)
        print(f"Found {len(expired_ids)} jobs discontinued before the cutoff")

        if args.dry_run:
            print("Dry run - nothing deleted")
            return 0

        if not expired_ids:
            print("Nothing to delete")
            return 0

        deleted = delete_jobs(client, expired_ids)
        print(f"Deleted {deleted}/{len(expired_ids)} rows")

    return 0


if __name__ == "__main__":
    sys.exit(main())
