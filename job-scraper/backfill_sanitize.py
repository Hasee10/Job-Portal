#!/usr/bin/env python
"""One-time backfill: re-sanitizes `description` for every row already in
the database, so rows written before jobscraper.sanitize existed get
cleaned up too (new rows are sanitized automatically by the pipeline going
forward).

Safe to re-run - rows whose description doesn't change are skipped.
"""

import sys

import psycopg2.extras

from jobscraper import db
from jobscraper.logging_conf import setup_logging
from jobscraper.sanitize import clean_description


def fetch_descriptions(conn) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("select id, description from public.jobs")
        return [dict(row) for row in cur.fetchall()]


def main() -> int:
    setup_logging()

    conn = db.get_connection()
    try:
        rows = fetch_descriptions(conn)
        print(f"Fetched {len(rows)} rows")

        updated = 0
        with conn.cursor() as cur:
            for row in rows:
                original = row.get("description")
                cleaned = clean_description(original)
                if cleaned == original:
                    continue

                try:
                    cur.execute(
                        "update public.jobs set description = %s where id = %s",
                        (cleaned, row["id"]),
                    )
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    print(f"FAILED to update {row['id']}: {e}")
                    continue
                updated += 1
                if updated % 200 == 0:
                    print(f"...{updated} updated so far")
    finally:
        conn.close()

    print(f"Done. Updated {updated}/{len(rows)} rows.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
