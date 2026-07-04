"""RemoteOK - https://remoteok.com/api (keyless, but 403s without a User-Agent).

Response is a top-level array whose first element is a legal notice, not a
job - filtered out below by requiring an `id`.
"""

from datetime import datetime

from jobscraper.sources.base import get_client, keep_valid

URL = "https://remoteok.com/api"


def fetch() -> list[dict]:
    with get_client() as client:
        resp = client.get(URL)
        resp.raise_for_status()
        data = resp.json()

    jobs = [j for j in data if isinstance(j, dict) and j.get("id")] if isinstance(data, list) else []

    out = []
    for job in jobs:
        posted_at = None
        if job.get("date"):
            try:
                posted_at = datetime.fromisoformat(
                    job["date"].replace("Z", "+00:00")
                ).isoformat()
            except ValueError:
                posted_at = None

        out.append(
            {
                "title": (job.get("position") or "").strip(),
                "company": (job.get("company") or "").strip(),
                "location": (job.get("location") or "").strip() or None,
                "remote_type": "remote",
                "apply_url": job.get("url"),
                "source": "remoteok",
                "description": job.get("description") or None,
                "posted_at": posted_at,
            }
        )
    return keep_valid(out)
