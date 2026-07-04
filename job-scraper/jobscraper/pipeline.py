import logging

from jobscraper import config, db, scoring, sweeper
from jobscraper.sanitize import clean_description
from jobscraper.sources import API_SOURCES
from jobscraper.sources.base import safe_fetch
from jobscraper.sources.browser import BROWSER_SOURCES
from jobscraper.sources.browser.session import browser_session
from jobscraper.sources.browser.themuse_resolver import resolve_themuse_apply_urls

logger = logging.getLogger(__name__)


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
    config.require_supabase()

    all_jobs = collect_api_sources()
    if include_browser_sources:
        muse_jobs = [job for job in all_jobs if job.get("source") == "themuse"]
        all_jobs.extend(collect_browser_sources(muse_jobs))

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

    processed = scoring.process(all_jobs)
    written = db.upsert_jobs(processed)
    logger.info("upserted %d jobs into Supabase", written)

    if run_sweeper:
        sweeper.sweep()
