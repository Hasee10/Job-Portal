#!/usr/bin/env python
"""One-time backfill: re-sanitizes `description` for every row already in
Supabase, so rows written before jobscraper.sanitize existed get cleaned up
too (new rows are sanitized automatically by the pipeline going forward).

Safe to re-run - rows whose description doesn't change are skipped.
"""

import sys

import httpx

from jobscraper import config
from jobscraper.logging_conf import setup_logging
from jobscraper.sanitize import clean_description

PAGE_SIZE = 500


def _headers():
    return {
        "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def fetch_descriptions(client: httpx.Client) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    url = f"{config.SUPABASE_URL}/rest/v1/jobs?select=id,description"
    while True:
        headers = {
            **_headers(),
            "Range-Unit": "items",
            "Range": f"{offset}-{offset + PAGE_SIZE - 1}",
        }
        resp = client.get(url, headers=headers)
        resp.raise_for_status()
        page = resp.json()
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def main() -> int:
    setup_logging()
    config.require_supabase()

    with httpx.Client(timeout=60.0) as client:
        rows = fetch_descriptions(client)
        print(f"Fetched {len(rows)} rows")

        updated = 0
        for row in rows:
            original = row.get("description")
            cleaned = clean_description(original)
            if cleaned == original:
                continue

            url = f"{config.SUPABASE_URL}/rest/v1/jobs?id=eq.{row['id']}"
            resp = client.patch(
                url,
                headers={**_headers(), "Prefer": "return=minimal"},
                json={"description": cleaned},
            )
            if resp.status_code >= 300:
                print(f"FAILED to update {row['id']}: {resp.status_code} {resp.text[:200]}")
                continue
            updated += 1
            if updated % 200 == 0:
                print(f"...{updated} updated so far")

    print(f"Done. Updated {updated}/{len(rows)} rows.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
