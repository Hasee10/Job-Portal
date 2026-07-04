import logging

import httpx

from jobscraper import config

logger = logging.getLogger(__name__)


def get_client() -> httpx.Client:
    return httpx.Client(
        timeout=config.HTTP_TIMEOUT,
        headers={"User-Agent": config.HTTP_USER_AGENT},
        follow_redirects=True,
    )


def keep_valid(jobs: list[dict]) -> list[dict]:
    """Same guard every n8n normalizer used: drop rows missing title/apply_url."""
    return [j for j in jobs if j.get("title") and j.get("apply_url")]


def safe_fetch(source_name: str, fn) -> list[dict]:
    """Run one source's fetch() and never let it take the whole run down."""
    try:
        jobs = fn()
        logger.info("%s: fetched %d jobs", source_name, len(jobs))
        return jobs
    except Exception:
        logger.exception("%s: fetch failed, skipping this source for this run", source_name)
        return []
