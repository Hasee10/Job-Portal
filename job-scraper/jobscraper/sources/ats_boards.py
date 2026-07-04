"""Greenhouse / Lever / Ashby company job boards.

All three are open, unauthenticated JSON APIs meant to power each company's
own public careers page - unlike Indeed/LinkedIn, there is no ToS violation
in reading them. The catch: there's no global search, you have to know each
company's board token. See sources/companies.json for the starter list, or
add more via ATS_EXTRA_BOARDS in .env.

  Greenhouse: https://boards-api.greenhouse.io/v1/boards/{token}/jobs
  Lever:      https://api.lever.co/v0/postings/{token}?mode=json
  Ashby:      https://api.ashbyhq.com/posting-api/job-board/{token}
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from jobscraper import config
from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)

COMPANIES_FILE = Path(__file__).parent / "companies.json"


def _load_boards() -> dict[str, list[str]]:
    boards = {"greenhouse": [], "lever": [], "ashby": []}
    if COMPANIES_FILE.exists():
        data = json.loads(COMPANIES_FILE.read_text(encoding="utf-8"))
        for platform in boards:
            boards[platform] = list(data.get(platform, []))

    # ATS_EXTRA_BOARDS entries: "token" (defaults to greenhouse) or "token:platform"
    for entry in config.ATS_EXTRA_BOARDS:
        if ":" in entry:
            token, platform = entry.split(":", 1)
        else:
            token, platform = entry, "greenhouse"
        platform = platform.strip().lower()
        if platform in boards:
            boards[platform].append(token.strip())

    return boards


def _fetch_greenhouse(token: str) -> list[dict]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
    with get_client() as client:
        resp = client.get(url, params={"content": "true"})
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        jobs = resp.json().get("jobs", [])

    out = []
    for job in jobs:
        posted_at = None
        if job.get("updated_at"):
            try:
                posted_at = datetime.fromisoformat(
                    job["updated_at"].replace("Z", "+00:00")
                ).isoformat()
            except ValueError:
                posted_at = None
        out.append(
            {
                "title": (job.get("title") or "").strip(),
                "company": (job.get("company_name") or token).strip(),
                "location": ((job.get("location") or {}).get("name") or "").strip() or None,
                "remote_type": "unknown",
                "apply_url": job.get("absolute_url"),
                "source": f"greenhouse:{token}",
                "description": job.get("content") or None,
                "posted_at": posted_at,
            }
        )
    return out


def _fetch_lever(token: str) -> list[dict]:
    url = f"https://api.lever.co/v0/postings/{token}"
    with get_client() as client:
        resp = client.get(url, params={"mode": "json"})
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        jobs = resp.json()
        if not isinstance(jobs, list):
            return []

    out = []
    for job in jobs:
        categories = job.get("categories") or {}
        text = f"{job.get('text') or ''} {categories.get('location') or ''}".lower()
        remote_type = (
            "remote" if "remote" in text else ("hybrid" if "hybrid" in text else "onsite")
        )
        posted_at = None
        if job.get("createdAt"):
            try:
                posted_at = datetime.fromtimestamp(
                    job["createdAt"] / 1000, tz=timezone.utc
                ).isoformat()
            except (ValueError, OSError, OverflowError):
                posted_at = None
        out.append(
            {
                "title": (job.get("text") or "").strip(),
                "company": token,
                "location": categories.get("location") or None,
                "remote_type": remote_type,
                "apply_url": job.get("applyUrl") or job.get("hostedUrl"),
                "source": f"lever:{token}",
                "description": job.get("descriptionPlain") or job.get("description") or None,
                "posted_at": posted_at,
            }
        )
    return out


def _fetch_ashby(token: str) -> list[dict]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{token}"
    with get_client() as client:
        resp = client.get(url)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        jobs = resp.json().get("jobs", [])

    out = []
    for job in jobs:
        if job.get("isListed") is False:
            continue
        remote_type = "remote" if job.get("isRemote") else "onsite"
        if (job.get("workplaceType") or "").lower() == "hybrid":
            remote_type = "hybrid"
        posted_at = None
        if job.get("publishedAt"):
            try:
                posted_at = datetime.fromisoformat(
                    job["publishedAt"].replace("Z", "+00:00")
                ).isoformat()
            except ValueError:
                posted_at = None
        out.append(
            {
                "title": (job.get("title") or "").strip(),
                "company": token,
                "location": job.get("location") or None,
                "remote_type": remote_type,
                "apply_url": job.get("applyUrl") or job.get("jobUrl"),
                "source": f"ashby:{token}",
                "description": job.get("descriptionPlain") or None,
                "posted_at": posted_at,
            }
        )
    return out


_FETCHERS = {
    "greenhouse": _fetch_greenhouse,
    "lever": _fetch_lever,
    "ashby": _fetch_ashby,
}


def fetch() -> list[dict]:
    boards = _load_boards()
    out: list[dict] = []
    for platform, tokens in boards.items():
        fetcher = _FETCHERS[platform]
        for token in tokens:
            try:
                jobs = fetcher(token)
                out.extend(jobs)
            except Exception:
                logger.exception("%s board '%s' failed, skipping", platform, token)
    return keep_valid(out)
