"""Jooble - https://jooble.org/api/about (free API key required)."""

import logging
from datetime import datetime

from jobscraper import config
from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)


def fetch() -> list[dict]:
    if not config.JOOBLE_API_KEY:
        logger.info("jooble: JOOBLE_API_KEY not set, skipping")
        return []

    url = f"https://jooble.org/api/{config.JOOBLE_API_KEY}"
    with get_client() as client:
        resp = client.post(url, json={"keywords": "developer", "location": ""})
        resp.raise_for_status()
        jobs = resp.json().get("jobs", [])

    out = []
    for job in jobs:
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
