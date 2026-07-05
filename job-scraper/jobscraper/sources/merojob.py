"""merojob - https://merojob.com (Nepal)

The site's own Next.js frontend is backed by a genuine public, unauthenticated
REST API at api.merojob.com (discovered by reading the frontend's initial
HTML for its API host, then probing standard DRF-style listing paths) -
confirmed live 2026-07, ~245 jobs, clean count/next/previous/results
pagination. Far more reliable than scraping rendered markup, same category
as the existing ats_boards.py integrations.
"""

import logging

from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)

BASE_URL = "https://merojob.com"
API_URL = "https://api.merojob.com/api/v1/jobs/"
MAX_PAGES = 15


def _parse_job(item: dict) -> dict | None:
    title = item.get("title")
    absolute_url = item.get("absolute_url")
    if not title or not absolute_url:
        return None
    apply_url = BASE_URL + absolute_url if absolute_url.startswith("/") else absolute_url

    client = item.get("client") or {}
    company = client.get("org_name") or client.get("client_name")

    locations = item.get("job_locations") or []
    location = ", ".join(
        loc.get("address") for loc in locations if loc.get("address")
    ) or None

    available_for = item.get("available_for") or []
    employment_type_hint = available_for[0].lower().replace(" ", "_") if available_for else None

    return {
        "title": title,
        "company": company,
        "location": location,
        "remote_type": "onsite" if location else "unknown",
        "apply_url": apply_url,
        "source": "merojob",
        "description": item.get("description"),
        "posted_at": item.get("posted_at"),
        "employment_type_hint": employment_type_hint,
    }


def fetch() -> list[dict]:
    out = []
    url = f"{API_URL}?page=1"
    with get_client() as client:
        for _ in range(MAX_PAGES):
            if not url:
                break
            try:
                resp = client.get(url, headers={"Accept": "application/json"})
                resp.raise_for_status()
                data = resp.json()
            except Exception:
                logger.warning("merojob: failed to load %s", url)
                break

            for item in data.get("results") or []:
                job = _parse_job(item)
                if job:
                    out.append(job)

            url = data.get("next")
    return keep_valid(out)
