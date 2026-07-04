"""One-off script to test the CockroachDB connection and apply the jobs
table schema. Reads the connection string from cockroachdb/.env only -
never touches bordful-main or job-scraper's Supabase configuration.
"""
import os
import sys
from pathlib import Path

import certifi
import psycopg2

ROOT = Path(__file__).parent
env_path = ROOT / ".env"
for line in env_path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, _, value = line.partition("=")
    os.environ.setdefault(key.strip(), value.strip())

DATABASE_URL = os.environ["COCKROACH_DATABASE_URL"]

MIGRATIONS = [
    ("001_create_jobs_table", """
        create table if not exists public.jobs (
          id uuid primary key default gen_random_uuid(),
          title text not null,
          company text,
          location text,
          remote_type text,
          apply_url text not null,
          source text not null,
          description text,
          posted_at timestamptz,
          created_at timestamptz not null default now()
        );
        create unique index if not exists jobs_apply_url_key on public.jobs (apply_url);
        create index if not exists jobs_source_idx on public.jobs (source);
        create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc);
    """),
    ("002_add_entry_level", """
        alter table public.jobs
          add column if not exists entry_level bool not null default false;
        create index if not exists jobs_entry_level_idx on public.jobs (entry_level);
    """),
    ("003_add_flagged_suspicious", """
        alter table public.jobs
          add column if not exists flagged_suspicious bool not null default false;
        create index if not exists jobs_flagged_suspicious_idx on public.jobs (flagged_suspicious);
    """),
    ("004_add_score", """
        alter table public.jobs
          add column if not exists score int4 not null default 0
            check (score >= 0 and score <= 100);
        create index if not exists jobs_score_idx on public.jobs (score desc);
    """),
    ("005_add_is_active", """
        alter table public.jobs
          add column if not exists is_active bool not null default true,
          add column if not exists discontinued_at timestamptz;
        create index if not exists jobs_is_active_idx on public.jobs (is_active);
    """),
    ("006_add_bordful_job_fields", """
        alter table public.jobs
          add column if not exists type text not null default 'Full-time',
          add column if not exists salary_min numeric,
          add column if not exists salary_max numeric,
          add column if not exists salary_currency text not null default 'USD',
          add column if not exists salary_unit text not null default 'year',
          add column if not exists benefits text,
          add column if not exists application_requirements text,
          add column if not exists valid_through timestamptz,
          add column if not exists job_identifier text,
          add column if not exists career_level string[] not null default array['NotSpecified']::string[],
          add column if not exists visa_sponsorship text not null default 'Not specified',
          add column if not exists featured bool not null default false,
          add column if not exists remote_region text,
          add column if not exists timezone_requirements text,
          add column if not exists workplace_city text,
          add column if not exists workplace_country text,
          add column if not exists languages string[] not null default array[]::string[],
          add column if not exists skills text,
          add column if not exists qualifications text,
          add column if not exists education_requirements text,
          add column if not exists experience_requirements text,
          add column if not exists industry text,
          add column if not exists occupational_category text,
          add column if not exists responsibilities text;
    """),
]


def main() -> int:
    print(f"Connecting to CockroachDB...")
    try:
        conn = psycopg2.connect(DATABASE_URL, sslrootcert=certifi.where())
    except Exception as e:
        print(f"CONNECTION FAILED: {e}")
        return 1

    print("Connected OK.")
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("select version();")
    print(f"Server version: {cur.fetchone()[0][:80]}")

    for name, sql in MIGRATIONS:
        try:
            cur.execute(sql)
            print(f"[OK] {name}")
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            return 1

    print("\n--- Verification ---")
    cur.execute("select count(*) from [show columns from public.jobs];")
    print(f"Column count: {cur.fetchone()[0]}")

    cur.execute("""
        select column_name from [show columns from public.jobs]
        order by column_name;
    """)
    cols = [r[0] for r in cur.fetchall()]
    print(f"Columns: {', '.join(cols)}")

    cur.execute("show indexes from public.jobs;")
    idx_names = sorted({r[1] for r in cur.fetchall()})
    print(f"Indexes: {', '.join(idx_names)}")

    cur.execute("select count(*) from public.jobs;")
    print(f"Row count: {cur.fetchone()[0]}")

    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
