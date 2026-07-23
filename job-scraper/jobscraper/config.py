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

# Adzuna's live country list (checked 2026-07) has zero Gulf/Middle East
# coverage - au, at, be, br, ca, fr, de, in, it, mx, nl, nz, pl, sg, za, es,
# ch, gb, us. So this pulls its weight for the North America + Asia legs of
# the regional push instead (in, sg alongside us/ca), not the Middle East -
# see JOOBLE_LOCATIONS in this file for the ME-covering source. Kept as a
# list (was a single ADZUNA_COUNTRY) so one run covers all of them.
ADZUNA_COUNTRIES = [
    c.strip().lower()
    for c in os.environ.get("ADZUNA_COUNTRIES", os.environ.get("ADZUNA_COUNTRY", "us,ca,in,sg")).split(",")
    if c.strip()
]
# Same rationale as JOOBLE_KEYWORDS - Adzuna's "what" param is free-text
# search, no industry/category facet that matches procurement/IT/AI/data
# cleanly, so this runs each keyword per country and merges results.
ADZUNA_KEYWORDS = [
    kw.strip()
    for kw in os.environ.get(
        "ADZUNA_KEYWORDS",
        "procurement,supply chain,information technology,artificial intelligence,data analyst",
    ).split(",")
    if kw.strip()
]

JOOBLE_API_KEY = os.environ.get("JOOBLE_API_KEY", "")

# Jooble has no category/industry filter, only a free-text keyword search, so
# broad coverage means running the search multiple times with different
# keyword x location combos and merging the results (deduped by apply_url
# downstream). Defaults target the industries and regions from the 2026-07
# scraper-expansion push (procurement/IT/AI/data, Middle East priority, plus
# South/North Asia and North America) - override via env if the mix needs to
# shift without a code change.
JOOBLE_KEYWORDS = [
    kw.strip()
    for kw in os.environ.get(
        "JOOBLE_KEYWORDS",
        "procurement,supply chain,information technology,artificial intelligence,data analyst",
    ).split(",")
    if kw.strip()
]
JOOBLE_LOCATIONS = [
    loc.strip()
    for loc in os.environ.get(
        "JOOBLE_LOCATIONS",
        "United Arab Emirates,Saudi Arabia,Qatar,Kuwait,Bahrain,Pakistan,India,United States",
    ).split(",")
    if loc.strip()
]

# GulfTalent (see sources/browser/gulftalent.py) - one query with no country
# filter already spans every country GulfTalent covers, so unlike
# Adzuna/Jooble this only needs a keyword list, not a keyword x location
# matrix.
GULFTALENT_KEYWORDS = [
    kw.strip()
    for kw in os.environ.get(
        "GULFTALENT_KEYWORDS",
        "procurement,supply chain,information technology,artificial intelligence,data analyst",
    ).split(",")
    if kw.strip()
]

# NaukriGulf (see sources/browser/naukrigulf.py) - same rationale as
# GulfTalent above, one query spans every Gulf country it covers.
NAUKRIGULF_KEYWORDS = [
    kw.strip()
    for kw in os.environ.get(
        "NAUKRIGULF_KEYWORDS",
        "procurement,supply chain,information technology,artificial intelligence,data analyst",
    ).split(",")
    if kw.strip()
]

# Bayt (see sources/browser/bayt.py) - unlike GulfTalent/NaukriGulf, Bayt's
# search is a plain server-rendered page keyed by country in the URL path
# (no single query spans every country), so this runs the
# BAYT_COUNTRIES x BAYT_KEYWORDS matrix like Adzuna/Jooble. Defaults are
# every GCC country plus the Levant (2026-07 scope decision: GCC first,
# Middle East incl. Levant overall).
BAYT_COUNTRIES = [
    c.strip()
    for c in os.environ.get(
        "BAYT_COUNTRIES",
        "uae,saudi-arabia,qatar,kuwait,bahrain,oman,jordan,lebanon,iraq,syria,palestine",
    ).split(",")
    if c.strip()
]
BAYT_KEYWORDS = [
    kw.strip()
    for kw in os.environ.get(
        "BAYT_KEYWORDS",
        "procurement,supply chain,information technology,artificial intelligence,data analyst",
    ).split(",")
    if kw.strip()
]
# Pages fetched per country x keyword combo (30 jobs/page, confirmed
# 2026-07). Kept low since the matrix is already 11 countries x 5 keywords -
# raising this multiplies runtime by the same factor.
BAYT_MAX_PAGES = int(os.environ.get("BAYT_MAX_PAGES", "2"))

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
