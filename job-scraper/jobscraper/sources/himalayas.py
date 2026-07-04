"""Himalayas - https://himalayas.app/jobs/api (keyless).

Schema is not perfectly stable - Himalayas blocks some headless fetches and
occasionally reshapes fields. If this starts returning 0 jobs, open the URL
directly in a browser and diff the JSON shape against the fields read below.
"""

from datetime import datetime, timezone

from jobscraper.sources.base import get_client, keep_valid

URL = "https://himalayas.app/jobs/api"


def fetch() -> list[dict]:
    with get_client() as client:
        resp = client.get(URL)
        resp.raise_for_status()
        body = resp.json()
        jobs = body.get("jobs") or body.get("data") or []

    out = []
    for job in jobs:
        restrictions = job.get("locationRestrictions")
        if isinstance(restrictions, list):
            location = ", ".join(restrictions) or None
        else:
            location = restrictions or None

        posted_at = None
        pub_date = job.get("pubDate")
        if pub_date:
            try:
                if isinstance(pub_date, (int, float)):
                    posted_at = datetime.fromtimestamp(pub_date, tz=timezone.utc).isoformat()
                else:
                    posted_at = datetime.fromisoformat(
                        str(pub_date).replace("Z", "+00:00")
                    ).isoformat()
            except (ValueError, OSError, OverflowError):
                posted_at = None

        out.append(
            {
                "title": (job.get("title") or "").strip(),
                "company": (job.get("companyName") or "").strip(),
                "location": location,
                "remote_type": "remote",
                "apply_url": job.get("applicationLink") or job.get("guid"),
                "source": "himalayas",
                "description": job.get("description") or job.get("excerpt") or None,
                "posted_at": posted_at,
            }
        )
    return keep_valid(out)
