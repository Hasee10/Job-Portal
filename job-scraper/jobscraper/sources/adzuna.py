"""Adzuna - https://developer.adzuna.com/ (free API keys required)."""

import logging
from datetime import datetime

from jobscraper import config
from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)


def fetch() -> list[dict]:
    if not config.ADZUNA_APP_ID or not config.ADZUNA_APP_KEY:
        logger.info("adzuna: ADZUNA_APP_ID/ADZUNA_APP_KEY not set, skipping")
        return []

    url = f"https://api.adzuna.com/v1/api/jobs/{config.ADZUNA_COUNTRY}/search/1"
    params = {
        "app_id": config.ADZUNA_APP_ID,
        "app_key": config.ADZUNA_APP_KEY,
        "results_per_page": 50,
        "content-type": "application/json",
    }
    with get_client() as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        jobs = resp.json().get("results", [])

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
            }
        )
    return keep_valid(out)
