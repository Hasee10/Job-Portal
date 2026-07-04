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

from jobscraper import config, db
from jobscraper.logging_conf import setup_logging

PAGE_SIZE = 500


def fetch_expired_ids(cutoff: datetime) -> list[str]:
    """Jobs that are inactive AND were discontinued before the cutoff -
    never touches active jobs or ones without a discontinued_at yet."""
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "select id from public.jobs where is_active = false and discontinued_at < %s",
                (cutoff,),
            )
            return [str(row[0]) for row in cur.fetchall()]
    finally:
        conn.close()


def delete_jobs(job_ids: list[str]) -> int:
    """Deletes in chunks via id = any(...) rather than one request per row."""
    conn = db.get_connection()
    deleted = 0
    try:
        with conn.cursor() as cur:
            for i in range(0, len(job_ids), PAGE_SIZE):
                chunk = job_ids[i : i + PAGE_SIZE]
                try:
                    cur.execute("delete from public.jobs where id = any(%s)", (chunk,))
                    conn.commit()
                    deleted += len(chunk)
                except Exception as e:
                    conn.rollback()
                    print(f"FAILED to delete a batch of {len(chunk)}: {e}")
                    continue
    finally:
        conn.close()
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
    config.require_database()

    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
    print(f"Retention window: {args.days} days (cutoff: {cutoff.isoformat()})")

    expired_ids = fetch_expired_ids(cutoff)
    print(f"Found {len(expired_ids)} jobs discontinued before the cutoff")

    if args.dry_run:
        print("Dry run - nothing deleted")
        return 0

    if not expired_ids:
        print("Nothing to delete")
        return 0

    deleted = delete_jobs(expired_ids)
    print(f"Deleted {deleted}/{len(expired_ids)} rows")

    return 0


if __name__ == "__main__":
    sys.exit(main())
