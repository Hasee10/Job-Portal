"""Jobicy - https://jobicy.com/jobs-rss-feed (keyless JSON API)."""

from datetime import datetime

from jobscraper.sources.base import get_client, keep_valid

URL = "https://jobicy.com/api/v2/remote-jobs"


def fetch() -> list[dict]:
    with get_client() as client:
        resp = client.get(URL, params={"count": 50})
        resp.raise_for_status()
        jobs = resp.json().get("jobs", [])

    out = []
    for job in jobs:
        posted_at = None
        if job.get("pubDate"):
            try:
                posted_at = datetime.fromisoformat(
                    job["pubDate"].replace("Z", "+00:00")
                ).isoformat()
            except ValueError:
                posted_at = None

        out.append(
            {
                "title": (job.get("jobTitle") or "").strip(),
                "company": (job.get("companyName") or "").strip(),
                "location": (job.get("jobGeo") or "").strip() or None,
                "remote_type": "remote",
                "apply_url": job.get("url"),
                "source": "jobicy",
                "description": job.get("jobDescription") or job.get("jobExcerpt") or None,
                "posted_at": posted_at,
            }
        )
    return keep_valid(out)
