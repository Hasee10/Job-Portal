"""Arbeitnow - https://documenter.getpostman.com/view/12043911/TVeqbmhy (keyless).

Arbeitnow's API `url` field only points to Arbeitnow's own hosted job page.
Verified by hand: that page's real "Apply" button actually lives at
`{url}/apply`, which 302-redirects straight to the employer's own ATS (e.g.
join.com) - that's the link a visitor actually wants, so it's resolved here
via one extra request per job rather than storing Arbeitnow's own page.
"""

import logging
from datetime import datetime, timezone

from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)

URL = "https://www.arbeitnow.com/api/job-board-api"


def _resolve_apply_url(client, arbeitnow_url: str) -> str:
    """Follow {url}/apply's redirect to the real employer application page.

    Falls back to the Arbeitnow page itself if the request fails or doesn't
    actually leave arbeitnow.com (keeps the listing usable either way).
    """
    try:
        resp = client.get(f"{arbeitnow_url}/apply", timeout=10.0)
        final_url = str(resp.url)
        if "arbeitnow.com" not in final_url:
            return final_url
    except Exception:
        logger.debug("arbeitnow: apply-redirect resolution failed for %s", arbeitnow_url)
    return arbeitnow_url


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

            arbeitnow_url = job.get("url")
            apply_url = (
                _resolve_apply_url(client, arbeitnow_url) if arbeitnow_url else None
            )

            out.append(
                {
                    "title": (job.get("title") or "").strip(),
                    "company": (job.get("company_name") or "").strip(),
                    "location": (job.get("location") or "").strip() or None,
                    "remote_type": "remote" if job.get("remote") else "onsite",
                    "apply_url": apply_url,
                    "source": "arbeitnow",
                    "description": job.get("description") or None,
                    "posted_at": posted_at,
                }
            )
    return keep_valid(out)
