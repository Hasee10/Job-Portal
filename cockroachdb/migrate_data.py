"""One-off data migration: Supabase public.jobs -> CockroachDB public.jobs.

Reads from Supabase via its existing PostgREST API using the
service_role key already configured in job-scraper/.env (read-only GET
requests - nothing is written back to Supabase, nothing there is modified).
Writes into CockroachDB via the connection in cockroachdb/.env.

Both source .env files are read as-is; neither is touched or modified by
this script.
"""
import os
import sys
from pathlib import Path

import certifi
import httpx
import psycopg2
import psycopg2.extras

ROOT = Path(__file__).parent
REPO_ROOT = ROOT.parent


def load_env(path: Path) -> dict:
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
    return env


supabase_env = load_env(REPO_ROOT / "job-scraper" / ".env")
crdb_env = load_env(ROOT / ".env")

SUPABASE_URL = supabase_env["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = supabase_env["SUPABASE_SERVICE_ROLE_KEY"]
CRDB_DSN = crdb_env["COCKROACH_DATABASE_URL"]

PAGE_SIZE = 500

# Every column in the jobs table, in a fixed order used for both the
# Supabase select and the CockroachDB insert.
COLUMNS = [
    "id", "title", "company", "location", "remote_type", "apply_url",
    "source", "description", "posted_at", "created_at", "entry_level",
    "flagged_suspicious", "score", "is_active", "discontinued_at", "type",
    "salary_min", "salary_max", "salary_currency", "salary_unit",
    "benefits", "application_requirements", "valid_through",
    "job_identifier", "career_level", "visa_sponsorship", "featured",
    "remote_region", "timezone_requirements", "workplace_city",
    "workplace_country", "languages", "skills", "qualifications",
    "education_requirements", "experience_requirements", "industry",
    "occupational_category", "responsibilities",
]


def fetch_all_from_supabase() -> list[dict]:
    """Paginated read-only GET against Supabase's PostgREST API. No writes."""
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Accept": "application/json",
    }
    rows: list[dict] = []
    offset = 0
    with httpx.Client(timeout=30.0) as client:
        while True:
            resp = client.get(
                f"{SUPABASE_URL}/rest/v1/jobs",
                headers={
                    **headers,
                    "Range-Unit": "items",
                    "Range": f"{offset}-{offset + PAGE_SIZE - 1}",
                },
                params={"select": "*", "order": "created_at.asc"},
            )
            resp.raise_for_status()
            page = resp.json()
            rows.extend(page)
            print(f"  fetched {len(rows)} rows so far...")
            if len(page) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
    return rows


def main() -> int:
    print("Reading from Supabase (read-only)...")
    rows = fetch_all_from_supabase()
    print(f"Total rows read from Supabase: {len(rows)}")

    print("\nConnecting to CockroachDB...")
    conn = psycopg2.connect(CRDB_DSN, sslrootcert=certifi.where())
    conn.autocommit = False
    cur = conn.cursor()

    placeholders = ", ".join(["%s"] * len(COLUMNS))
    col_list = ", ".join(COLUMNS)
    update_clause = ", ".join(f"{c} = excluded.{c}" for c in COLUMNS if c not in ("id", "apply_url"))
    insert_sql = f"""
        insert into public.jobs ({col_list})
        values ({placeholders})
        on conflict (apply_url) do update set {update_clause}
    """

    written = 0
    failed = 0
    batch_size = 200
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        values = []
        for row in batch:
            values.append(tuple(row.get(c) for c in COLUMNS))
        try:
            psycopg2.extras.execute_batch(cur, insert_sql, values, page_size=batch_size)
            conn.commit()
            written += len(batch)
            print(f"  written {written}/{len(rows)}")
        except Exception as e:
            conn.rollback()
            print(f"  BATCH FAILED (rows {i}-{i+len(batch)}): {e}")
            failed += len(batch)

    print(f"\nDone. Written: {written}, failed: {failed}")

    cur.execute("select count(*) from public.jobs;")
    print(f"CockroachDB jobs table row count: {cur.fetchone()[0]}")

    cur.close()
    conn.close()
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
