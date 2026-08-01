"""Full-description enrichment for truncated Jooble postings.

Jooble's API only returns a short snippet, not the full job description.
job.apply_url is already the original posting elsewhere (the frontend's
truncation warning links straight to it - see needs_enrichment() below for
the truncation heuristic). This fills in the real description two ways:

Tier A (preferred, no browser): apply_url matches a known ATS's public
posting URL shape (Greenhouse / Lever / Ashby - the same platforms
ats_boards.py already reads for its own sources). Hit that platform's JSON
API directly with httpx: cheap, fast, no bot-detection risk.

Tier B (fallback): everything else - reuse the pipeline's already-open
CloakBrowser session to load apply_url and pull the description out of
embedded JSON-LD (schema.org JobPosting, the same structured data most
ATS/company career pages emit for their own SEO) or, failing that, a
handful of common main-content selectors. Also checks canonical/og:url and
swaps apply_url to it only when that URL is clearly the same posting on a
stable link (no query string, no utm_ params) rather than a tracking
redirect.

Every path is fail-soft: any exception here just means the job keeps its
original (possibly-truncated) Jooble snippet - this must never block the
run or drop a job.
"""

import json
import logging
import re
import time

from jobscraper import config
from jobscraper.sources.base import get_client

logger = logging.getLogger(__name__)

TRUNCATION_SUFFIXES = ("…", "...")
MIN_DESCRIPTION_LENGTH = 250

# Whole enrichment stage (all jobs, not per-job) is capped so a large batch
# of truncated Jooble postings can't blow out the pipeline's own runtime -
# remaining jobs just keep their original snippet once the budget runs out.
ENRICH_TIME_BUDGET_SECONDS = 120.0
RETRY_BACKOFF_SECONDS = 1.5


def needs_enrichment(job: dict) -> bool:
    if job.get("source") != "jooble":
        return False
    description = job.get("description") or ""
    if not description:
        return True
    stripped = description.rstrip()
    if any(stripped.endswith(suffix) for suffix in TRUNCATION_SUFFIXES):
        return True
    return len(description) < MIN_DESCRIPTION_LENGTH


# (platform, regex over apply_url capturing (token, job_id))
_ATS_URL_PATTERNS = [
    ("greenhouse", re.compile(r"(?:boards|job-boards)\.greenhouse\.io/([^/]+)/jobs/(\d+)", re.I)),
    ("lever", re.compile(r"jobs\.lever\.co/([^/]+)/([0-9a-f-]{20,36})", re.I)),
    ("ashby", re.compile(r"jobs\.ashbyhq\.com/([^/]+)/([0-9a-f-]{20,36})", re.I)),
]


def _match_ats(apply_url: str):
    for platform, pattern in _ATS_URL_PATTERNS:
        m = pattern.search(apply_url)
        if m:
            return platform, m.group(1), m.group(2)
    return None


def _fetch_greenhouse_job(token: str, job_id: str) -> str | None:
    url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{job_id}"
    with get_client() as client:
        resp = client.get(url, params={"content": "true"})
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json().get("content") or None


def _fetch_lever_job(token: str, job_id: str) -> str | None:
    url = f"https://api.lever.co/v0/postings/{token}/{job_id}"
    with get_client() as client:
        resp = client.get(url, params={"mode": "json"})
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        return data.get("descriptionPlain") or data.get("description") or None


def _fetch_ashby_job(token: str, job_id: str) -> str | None:
    # Ashby has no single-job public endpoint - only the job-board list
    # endpoint (the one ats_boards.py's Ashby source already reads), so this
    # fetches that and picks out the one job we need.
    url = f"https://api.ashbyhq.com/posting-api/job-board/{token}"
    with get_client() as client:
        resp = client.get(url)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        for posting in resp.json().get("jobs", []):
            if posting.get("id") == job_id:
                return posting.get("descriptionPlain") or None
    return None


_ATS_FETCHERS = {
    "greenhouse": _fetch_greenhouse_job,
    "lever": _fetch_lever_job,
    "ashby": _fetch_ashby_job,
}


def _enrich_via_ats(apply_url: str) -> str | None:
    """Raises on network/parse failure so the caller's retry can kick in;
    returns None (no retry needed) when apply_url just isn't a known ATS.
    """
    match = _match_ats(apply_url)
    if not match:
        return None
    platform, token, job_id = match
    return _ATS_FETCHERS[platform](token, job_id)


_CONTENT_SELECTORS = [
    "[class*='job-description']",
    "[class*='jobDescription']",
    "[id*='job-description']",
    "article",
    "main",
]


def _extract_via_jsonld(page) -> str | None:
    scripts = page.query_selector_all("script[type='application/ld+json']")
    for script in scripts:
        raw = script.inner_text()
        if not raw or "JobPosting" not in raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        candidates = data if isinstance(data, list) else [data]
        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("@type") == "JobPosting":
                description = candidate.get("description")
                if description:
                    return description
    return None


def _extract_via_selectors(page) -> str | None:
    for selector in _CONTENT_SELECTORS:
        el = page.query_selector(selector)
        if el is not None:
            text = el.inner_text().strip()
            if text and len(text) >= MIN_DESCRIPTION_LENGTH:
                return text
    return None


def _better_apply_url(page, original_url: str) -> str:
    """Prefers a canonical/og:url over the Jooble-supplied original only
    when it's clearly a stable link to the same posting (no query string,
    no utm_ params) - never swaps to something that looks like a tracking
    redirect.
    """
    for selector, attr in (("link[rel='canonical']", "href"), ("meta[property='og:url']", "content")):
        el = page.query_selector(selector)
        if el is None:
            continue
        value = (el.get_attribute(attr) or "").strip()
        if value and value.startswith("http") and "?" not in value and "utm_" not in value:
            return value
    return original_url


def _enrich_via_browser(browser, apply_url: str) -> tuple[str | None, str]:
    page = browser.new_page()
    try:
        page.goto(apply_url, timeout=20_000, wait_until="domcontentloaded")
        description = _extract_via_jsonld(page) or _extract_via_selectors(page)
        better_url = _better_apply_url(page, apply_url)
        return description, better_url
    finally:
        page.close()


def _with_retry(fn, *args):
    try:
        return fn(*args)
    except Exception:
        logger.debug("enrichment: first attempt failed, retrying once", exc_info=True)
        time.sleep(RETRY_BACKOFF_SECONDS)
        return fn(*args)


def enrich_job(browser, job: dict) -> dict:
    """Best-effort description/apply_url enrichment for one Jooble job.
    Always returns a job dict - on any failure, the original is returned
    unchanged (fail-soft).
    """
    apply_url = job.get("apply_url")
    if not apply_url:
        return job

    try:
        description = _with_retry(_enrich_via_ats, apply_url)
        if description:
            return {**job, "description": description}
    except Exception:
        logger.debug("enrichment: Tier A failed for %s", apply_url, exc_info=True)

    try:
        description, better_url = _with_retry(_enrich_via_browser, browser, apply_url)
        if description:
            return {**job, "description": description, "apply_url": better_url}
        return job
    except Exception:
        logger.debug("enrichment: Tier B failed for %s", apply_url, exc_info=True)
        return job


def enrich_jobs(browser, jobs: list[dict]) -> dict:
    """Runs enrich_job() over every job in `jobs` that needs_enrichment(),
    bounded by ENRICH_TIME_BUDGET_SECONDS for the whole batch - once the
    budget runs out, remaining jobs simply keep their original snippet
    rather than extending the pipeline's own runtime. Mutates `jobs` in
    place (jooble.py's fetch() output list); returns run stats for the
    summary report.
    """
    stats = {"attempted": 0, "succeeded": 0, "failed": 0}
    if not config.ENABLE_DESCRIPTION_ENRICHMENT:
        return stats

    deadline = time.monotonic() + ENRICH_TIME_BUDGET_SECONDS
    for i, job in enumerate(jobs):
        if not needs_enrichment(job):
            continue
        if time.monotonic() >= deadline:
            logger.info(
                "enrichment: time budget (%.0fs) exhausted, leaving remaining Jooble jobs as-is",
                ENRICH_TIME_BUDGET_SECONDS,
            )
            break

        stats["attempted"] += 1
        original_description = job.get("description")
        try:
            enriched = enrich_job(browser, job)
        except Exception:
            logger.exception(
                "enrichment: unexpected failure for %s, keeping original", job.get("apply_url")
            )
            enriched = job

        if enriched.get("description") and enriched.get("description") != original_description:
            stats["succeeded"] += 1
            jobs[i] = enriched
        else:
            stats["failed"] += 1

    logger.info(
        "enrichment: attempted=%d succeeded=%d failed=%d",
        stats["attempted"],
        stats["succeeded"],
        stats["failed"],
    )
    return stats
