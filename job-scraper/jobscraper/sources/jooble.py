"""Jooble - https://jooble.org/api/about (free API key required).

Jooble has no industry/category filter, only free-text keyword + location
search, and covers 65 countries including the Gulf (UAE, Saudi Arabia,
Qatar, Kuwait, Bahrain - confirmed live 2026-07) alongside South Asia and
North America. To get broad, targeted coverage instead of one arbitrary
query, this runs the full JOOBLE_KEYWORDS x JOOBLE_LOCATIONS matrix and
merges the results (deduped by apply_url - the same posting can surface
under more than one keyword). One combo failing (rate limit, bad location
string) is logged and skipped rather than dropping the whole source.
"""

import logging
from datetime import datetime

from jobscraper import config
from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)


def _fetch_one(client, keywords: str, location: str) -> list[dict]:
    url = f"https://jooble.org/api/{config.JOOBLE_API_KEY}"
    resp = client.post(url, json={"keywords": keywords, "location": location})
    resp.raise_for_status()
    return resp.json().get("jobs", [])


def fetch() -> list[dict]:
    if not config.JOOBLE_API_KEY:
        logger.info("jooble: JOOBLE_API_KEY not set, skipping")
        return []

    raw_jobs = []
    seen_urls: set[str] = set()
    with get_client() as client:
        for keywords in config.JOOBLE_KEYWORDS:
            for location in config.JOOBLE_LOCATIONS:
                try:
                    for job in _fetch_one(client, keywords, location):
                        link = job.get("link")
                        if link and link in seen_urls:
                            continue
                        if link:
                            seen_urls.add(link)
                        raw_jobs.append(job)
                except Exception:
                    logger.exception(
                        "jooble: query keywords=%r location=%r failed, skipping this combo",
                        keywords,
                        location,
                    )

    out = []
    for job in raw_jobs:
        text = f"{job.get('title') or ''} {job.get('snippet') or ''}".lower()
        remote_type = (
            "remote" if "remote" in text else ("hybrid" if "hybrid" in text else "onsite")
        )
        description = job.get("snippet")
        salary = job.get("salary")
        if description and salary:
            description = f"{description} Salary: {salary}"
        elif salary:
            description = f"Salary: {salary}"

        posted_at = None
        if job.get("updated"):
            try:
                posted_at = datetime.fromisoformat(
                    job["updated"].replace("Z", "+00:00")
                ).isoformat()
            except ValueError:
                posted_at = None

        out.append(
            {
                "title": (job.get("title") or "").strip(),
                "company": (job.get("company") or "").strip(),
                "location": (job.get("location") or "").strip() or None,
                "remote_type": remote_type,
                "apply_url": job.get("link"),
                "source": "jooble",
                "description": description,
                "posted_at": posted_at,
            }
        )
    return keep_valid(out)
