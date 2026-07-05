import logging

from jobscraper import config, db, scoring, sweeper
from jobscraper.classify import classify_career_level, classify_employment_type
from jobscraper.sanitize import clean_description
from jobscraper.sources import API_SOURCES
from jobscraper.sources.base import safe_fetch
from jobscraper.sources.browser import BROWSER_SOURCES
from jobscraper.sources.browser.session import browser_session
from jobscraper.sources.browser.themuse_resolver import resolve_themuse_apply_urls

logger = logging.getLogger(__name__)

# Sources whose apply_url can't be liveness-checked with sweeper.py's plain
# HTTP GET (Cloudflare-gated - a scripted request gets challenged regardless
# of whether the posting is still open) - see db.mark_missing_from_source
# for how these get their stale/closed postings cleaned up instead.
PRESENCE_RECONCILED_SOURCES = ("upwork", "rozee")


def collect_api_sources() -> list[dict]:
    jobs: list[dict] = []
    for module in API_SOURCES:
        jobs.extend(safe_fetch(module.__name__.rsplit(".", 1)[-1], module.fetch))
    return jobs


def collect_browser_sources(muse_jobs: list[dict]) -> list[dict]:
    """Runs BROWSER_SOURCES, and - in the same browser session - resolves
    The Muse's real apply URLs for the API-sourced jobs passed in (mutates
    them in place; see themuse_resolver for why this needs a real browser).
    """
    jobs: list[dict] = []
    try:
        with browser_session() as browser:
            for module in BROWSER_SOURCES:
                name = module.__name__.rsplit(".", 1)[-1]
                if name in config.SKIP_SOURCES:
                    logger.info("%s: skipped (in SKIP_SOURCES)", name)
                    continue
                jobs.extend(safe_fetch(name, lambda m=module: m.fetch(browser)))

            try:
                resolve_themuse_apply_urls(browser, muse_jobs)
            except Exception:
                logger.exception("themuse apply-url resolution failed, keeping fallback URLs")
    except Exception:
        logger.exception(
            "browser session failed to start (CloakBrowser binary missing? "
            "run `python -m cloakbrowser install`) - skipping all browser sources"
        )
    return jobs


def run(include_browser_sources: bool = True, run_sweeper: bool = True) -> None:
    config.require_database()

    all_jobs = collect_api_sources()
    presence_reconciled_jobs: dict[str, list[dict]] = {s: [] for s in PRESENCE_RECONCILED_SOURCES}
    if include_browser_sources:
        muse_jobs = [job for job in all_jobs if job.get("source") == "themuse"]
        browser_jobs = collect_browser_sources(muse_jobs)
        for source in PRESENCE_RECONCILED_SOURCES:
            presence_reconciled_jobs[source] = [
                job for job in browser_jobs if job.get("source") == source
            ]
        all_jobs.extend(browser_jobs)

    logger.info("collected %d raw jobs before processing", len(all_jobs))

    for job in all_jobs:
        job["description"] = clean_description(job.get("description"))
        # Being freshly scraped IS proof of life - reactivate unconditionally.
        # Without this, a job the sweeper wrongly (or rightly, then the
        # posting got reopened) marked is_active=false would never come back
        # even though the merge-duplicates upsert refreshes every other
        # field, since is_active is never included in a source's own job
        # dict and PostgREST's merge-duplicates only touches columns present
        # in the payload.
        job["is_active"] = True
        # No source set `type`/`career_level` before this - every job
        # silently fell back to the database defaults ('Full-time' /
        # ['NotSpecified']), which made the portal's Job Type and Career
        # Level filters look broken (checking "Contract" or "Senior" showed
        # ~0 results no matter how many such jobs actually existed).
        job["type"] = classify_employment_type(job)
        job["career_level"] = classify_career_level(job)
        # employment_type_hint is classify_employment_type's input, not a
        # real column - drop it so it doesn't reach the upsert payload.
        job.pop("employment_type_hint", None)

    processed = scoring.process(all_jobs)
    written = db.upsert_jobs(processed)
    logger.info("upserted %d jobs into Supabase", written)

    for source, jobs in presence_reconciled_jobs.items():
        if not jobs:
            continue
        removed = db.mark_missing_from_source(
            source, [job["apply_url"] for job in jobs if job.get("apply_url")]
        )
        logger.info(
            "%s: deactivated %d jobs no longer present in this run's search results",
            source,
            removed,
        )

    if run_sweeper:
        sweeper.sweep()
