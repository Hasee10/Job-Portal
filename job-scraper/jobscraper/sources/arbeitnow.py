"""Arbeitnow - https://documenter.getpostman.com/view/12043911/TVeqbmhy (keyless)."""

from datetime import datetime, timezone

from jobscraper.sources.base import get_client, keep_valid

URL = "https://www.arbeitnow.com/api/job-board-api"


def fetch() -> list[dict]:
    with get_client() as client:
        resp = client.get(URL)
        resp.raise_for_status()
        jobs = resp.json().get("data", [])

    out = []
    for job in jobs:
        posted_at = None
        if job.get("created_at"):
            try:
                posted_at = datetime.fromtimestamp(
                    job["created_at"], tz=timezone.utc
                ).isoformat()
            except (ValueError, OSError, OverflowError):
                posted_at = None

        out.append(
            {
                "title": (job.get("title") or "").strip(),
                "company": (job.get("company_name") or "").strip(),
                "location": (job.get("location") or "").strip() or None,
                "remote_type": "remote" if job.get("remote") else "onsite",
                "apply_url": job.get("url"),
                "source": "arbeitnow",
                "description": job.get("description") or None,
                "posted_at": posted_at,
            }
        )
    return keep_valid(out)
