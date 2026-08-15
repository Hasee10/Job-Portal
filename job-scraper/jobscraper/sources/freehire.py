"""freehire.me - https://freehire.me (keyless public REST API).

Tech-focused job aggregator (software, data, engineering, DevOps, remote),
multi-market. MIT-licensed and self-hostable - honors FREEHIRE_API_URL if
set (e.g. for a self-hosted instance), otherwise hits the hosted API.
Confirmed clean of ToS concerns: this is a public API meant to be queried
this way, unlike LinkedIn's guest endpoints (deliberately not scraped here -
LinkedIn's own ToS prohibits automated access, same category this pipeline
already treats Indeed/Glassdoor/Naukri/ZipRecruiter with caution for).

Uses the /api/v1/agent/jobs/search endpoint (not /api/v1/jobs/search) so
each hit carries the full job description inline - no per-job detail
follow-up needed.
"""

import os
from datetime import datetime

from jobscraper.sources.base import get_client, keep_valid

BASE_URL = os.environ.get("FREEHIRE_API_URL", "https://freehire.me").rstrip("/")
SEARCH_URL = f"{BASE_URL}/api/v1/agent/jobs/search"

WORK_MODE_TO_REMOTE_TYPE = {
    "remote": "remote",
    "hybrid": "hybrid",
    "onsite": "onsite",
}


def fetch() -> list[dict]:
    jobs: list[dict] = []
    limit = 100
    offset = 0

    with get_client() as client:
        # Total pool is huge (1M+ jobs across all history) - posted_within_days
        # scopes each daily run to genuinely new postings instead of paging
        # through the entire archive. A handful of pages is enough at that
        # scope; dedupe on (source, job_identifier) in db.py makes re-fetching
        # already-seen postings free either way.
        for _ in range(5):
            resp = client.get(
                SEARCH_URL,
                params={
                    "limit": limit,
                    "offset": offset,
                    "semantic_ratio": 0,
                    "include_description": "true",
                    "description_format": "text",
                    "posted_within_days": 2,
                },
            )
            resp.raise_for_status()
            page = resp.json().get("data", [])
            if not page:
                break
            jobs.extend(page)
            if len(page) < limit:
                break
            offset += limit

    out = []
    for job in jobs:
        posted_at = None
        if job.get("posted_at"):
            try:
                posted_at = datetime.fromisoformat(
                    job["posted_at"].replace("Z", "+00:00")
                ).isoformat()
            except ValueError:
                posted_at = None

        out.append(
            {
                "title": (job.get("title") or "").strip(),
                "company": (job.get("company") or "").strip(),
                "location": (job.get("location") or "").strip() or None,
                "remote_type": WORK_MODE_TO_REMOTE_TYPE.get(job.get("work_mode")),
                "apply_url": job.get("url"),
                "source": "freehire",
                "description": job.get("description") or None,
                "posted_at": posted_at,
            }
        )
    return keep_valid(out)
