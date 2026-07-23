"""Adzuna - https://developer.adzuna.com/ (free API keys required).

Adzuna has no Gulf/Middle East coverage at all (confirmed against its live
country list, 2026-07) so this covers the North America + Asia legs of the
regional push instead - see ADZUNA_COUNTRIES in config.py. Runs the
ADZUNA_COUNTRIES x ADZUNA_KEYWORDS matrix and merges results (deduped by
apply_url) since Adzuna's search is free-text with no industry facet that
maps cleanly onto procurement/IT/AI/data. One combo failing doesn't drop the
rest.
"""

import logging
from datetime import datetime

from jobscraper import config
from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)


def _fetch_one(client, country: str, keywords: str) -> list[dict]:
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": config.ADZUNA_APP_ID,
        "app_key": config.ADZUNA_APP_KEY,
        "results_per_page": 50,
        "content-type": "application/json",
        "what": keywords,
    }
    resp = client.get(url, params=params)
    resp.raise_for_status()
    return resp.json().get("results", [])


def fetch() -> list[dict]:
    if not config.ADZUNA_APP_ID or not config.ADZUNA_APP_KEY:
        logger.info("adzuna: ADZUNA_APP_ID/ADZUNA_APP_KEY not set, skipping")
        return []

    jobs = []
    seen_urls: set[str] = set()
    with get_client() as client:
        for country in config.ADZUNA_COUNTRIES:
            for keywords in config.ADZUNA_KEYWORDS:
                try:
                    for job in _fetch_one(client, country, keywords):
                        link = job.get("redirect_url")
                        if link and link in seen_urls:
                            continue
                        if link:
                            seen_urls.add(link)
                        jobs.append(job)
                except Exception:
                    logger.exception(
                        "adzuna: query country=%r keywords=%r failed, skipping this combo",
                        country,
                        keywords,
                    )

    out = []
    for job in jobs:
        text = f"{job.get('title') or ''} {job.get('description') or ''}".lower()
        remote_type = (
            "remote" if "remote" in text else ("hybrid" if "hybrid" in text else "onsite")
        )
        posted_at = None
        if job.get("created"):
            try:
                posted_at = datetime.fromisoformat(
                    job["created"].replace("Z", "+00:00")
                ).isoformat()
            except ValueError:
                posted_at = None

        out.append(
            {
                "title": (job.get("title") or "").strip(),
                "company": ((job.get("company") or {}).get("display_name") or "").strip(),
                "location": ((job.get("location") or {}).get("display_name") or "").strip()
                or None,
                "remote_type": remote_type,
                "apply_url": job.get("redirect_url"),
                "source": "adzuna",
                "description": job.get("description") or None,
                "posted_at": posted_at,
                "salary_min": job.get("salary_min"),
                "salary_max": job.get("salary_max"),
                # contract_time: 'full_time'/'part_time'; contract_type:
                # 'permanent'/'contract' - either maps cleanly in classify.py.
                "employment_type_hint": job.get("contract_time")
                or job.get("contract_type"),
            }
        )
    return keep_valid(out)
