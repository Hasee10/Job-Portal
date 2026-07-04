import logging

from jobscraper import config, db, scoring, sweeper
from jobscraper.sources import API_SOURCES
from jobscraper.sources.base import safe_fetch
from jobscraper.sources.browser import BROWSER_SOURCES
from jobscraper.sources.browser.session import browser_session

logger = logging.getLogger(__name__)


def collect_api_sources() -> list[dict]:
    jobs: list[dict] = []
    for module in API_SOURCES:
        jobs.extend(safe_fetch(module.__name__.rsplit(".", 1)[-1], module.fetch))
    return jobs


def collect_browser_sources() -> list[dict]:
    jobs: list[dict] = []
    try:
        with browser_session() as browser:
            for module in BROWSER_SOURCES:
                name = module.__name__.rsplit(".", 1)[-1]
                jobs.extend(safe_fetch(name, lambda m=module: m.fetch(browser)))
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
        all_jobs.extend(collect_browser_sources())

    logger.info("collected %d raw jobs before processing", len(all_jobs))

    processed = scoring.process(all_jobs)
    written = db.upsert_jobs(processed)
    logger.info("upserted %d jobs into Supabase", written)

    if run_sweeper:
        sweeper.sweep()
