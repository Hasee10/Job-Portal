import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

# Supabase - active database (switched back from CockroachDB which hit RU limit).
# db.py uses the PostgREST REST API with the service role key for full read/write.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# CockroachDB - FROZEN (hit monthly RU limit).
COCKROACH_DATABASE_URL = os.environ.get("COCKROACH_DATABASE_URL", "")

ADZUNA_APP_ID = os.environ.get("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.environ.get("ADZUNA_APP_KEY", "")
ADZUNA_COUNTRY = os.environ.get("ADZUNA_COUNTRY", "gb")

JOOBLE_API_KEY = os.environ.get("JOOBLE_API_KEY", "")

ATS_EXTRA_BOARDS = [
    token.strip()
    for token in os.environ.get("ATS_EXTRA_BOARDS", "").split(",")
    if token.strip()
]

CLOAKBROWSER_LICENSE_KEY = os.environ.get("CLOAKBROWSER_LICENSE_KEY", "") or None
SCRAPER_PROXY = os.environ.get("SCRAPER_PROXY", "") or None

# Comma-separated source module names to skip entirely for this run. Set to
# "upwork,rozee" in the GitHub Actions workflow only - both are Cloudflare-
# gated and GitHub's datacenter runner IPs get blocked outright (confirmed
# live 2026-07: 0 job tiles on every query, even the sweeper's plain HTTP
# liveness check got 403'd), unlike a home/residential IP where both work
# fine. Left unset locally so they still run via the Windows Scheduled Task.
SKIP_SOURCES = {
    name.strip() for name in os.environ.get("SKIP_SOURCES", "").split(",") if name.strip()
}

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# How long a job stays in the table after being marked discontinued before
# retention_cleanup.py permanently deletes it. Supabase's free tier caps the
# database at 500MB total; the sweeper only ever sets is_active=false, so
# without this the table grows forever even for jobs that have been dead for
# a year. 90 days keeps plenty of history for review while still bounding
# growth long-term.
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "90"))

HTTP_TIMEOUT = 30.0
HTTP_USER_AGENT = "Mozilla/5.0 (compatible; JobPortalCollector/1.0)"


def require_database() -> None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in "
            f"{ROOT_DIR / '.env'} before running the scraper."
        )
