"""Greenhouse / Lever / Ashby / SmartRecruiters / Recruitee / Personio
company job boards.

All six are open, unauthenticated JSON/XML APIs meant to power each
company's own public careers page - unlike Indeed/LinkedIn, there is no ToS
violation in reading them. The catch: there's no global search, you have to
know each company's board token. See sources/companies.json for the starter
list, or add more via ATS_EXTRA_BOARDS in .env.

  Greenhouse:     https://boards-api.greenhouse.io/v1/boards/{token}/jobs
  Lever:          https://api.lever.co/v0/postings/{token}?mode=json
  Ashby:          https://api.ashbyhq.com/posting-api/job-board/{token}
  SmartRecruiters: https://api.smartrecruiters.com/v1/companies/{token}/postings
  Recruitee:      https://{token}.recruitee.com/api/offers/
  Personio:       https://{token}.jobs.personio.de/xml

Two platforms from the original Grok-sourced wishlist were tried and
dropped after live verification (2026-07): Workable's public
apply.workable.com widget/account endpoints return company profile
metadata but no populated job list through any URL shape tried - either
deprecated or no longer reflects live postings. BreezyHR's `{token}.breezy.hr/json`
is behind Cloudflare bot protection that 403s a plain HTTP client on most
accounts - would need CloakBrowser, not a quick API integration. Neither is
wired in; revisit only with a CloakBrowser-based approach if still wanted.
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
    boards = {
        "greenhouse": [],
        "lever": [],
        "ashby": [],
        "smartrecruiters": [],
        "recruitee": [],
        "personio": [],
    }
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
                "employment_type_hint": categories.get("commitment"),
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


def _fetch_smartrecruiters(token: str) -> list[dict]:
    """List endpoint only returns summary fields (no description) - fetch
    each posting's detail for the real job description. One extra request
    per job, acceptable for a 12h-cycle batch job; a single company's
    detail-fetch failure is caught per-job so it doesn't drop the rest of
    that company's postings.
    """
    list_url = f"https://api.smartrecruiters.com/v1/companies/{token}/postings"
    with get_client() as client:
        resp = client.get(list_url)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        postings = resp.json().get("content", [])

        out = []
        for posting in postings:
            posting_id = posting.get("id")
            description = None
            try:
                detail = client.get(f"{list_url}/{posting_id}")
                detail.raise_for_status()
                sections = detail.json().get("jobAd", {}).get("sections", {})
                description = "\n\n".join(
                    section["text"]
                    for section in sections.values()
                    if section.get("text")
                ) or None
            except Exception:
                logger.debug(
                    "smartrecruiters:%s posting %s detail fetch failed, keeping list-only fields",
                    token,
                    posting_id,
                )

            employment_type_hint = (posting.get("typeOfEmployment") or {}).get("id")
            location = posting.get("location") or {}
            remote_type = (
                "remote"
                if location.get("remote")
                else ("hybrid" if location.get("hybrid") else "onsite")
            )
            out.append(
                {
                    "title": (posting.get("name") or "").strip(),
                    "company": (posting.get("company") or {}).get("name") or token,
                    "location": location.get("fullLocation") or None,
                    "remote_type": remote_type,
                    "apply_url": f"https://jobs.smartrecruiters.com/{token}/{posting_id}",
                    "source": f"smartrecruiters:{token}",
                    "description": description,
                    "posted_at": posting.get("releasedDate"),
                    "employment_type_hint": employment_type_hint,
                }
            )
    return out


def _fetch_recruitee(token: str) -> list[dict]:
    url = f"https://{token}.recruitee.com/api/offers/"
    with get_client() as client:
        resp = client.get(url, follow_redirects=True)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        offers = resp.json().get("offers", [])

    out = []
    for offer in offers:
        remote_type = "remote" if offer.get("remote") else ("hybrid" if offer.get("hybrid") else "onsite")
        out.append(
            {
                "title": (offer.get("title") or "").strip(),
                "company": offer.get("company_name") or token,
                "location": offer.get("location") or None,
                "remote_type": remote_type,
                "apply_url": offer.get("careers_url"),
                "source": f"recruitee:{token}",
                "description": offer.get("description") or offer.get("highlight") or None,
                "posted_at": offer.get("updated_at"),
            }
        )
    return out


def _fetch_personio(token: str) -> list[dict]:
    """Personio's public XML feed - no auth, meant for exactly this kind of
    consumption. No apply_url field in the feed itself; Personio's public
    career-site URL convention (https://{token}.jobs.personio.de/job/{id})
    is stable and documented, confirmed against personio.jobs.personio.de
    itself.
    """
    import xml.etree.ElementTree as ET

    url = f"https://{token}.jobs.personio.de/xml"
    with get_client() as client:
        resp = client.get(url, follow_redirects=True)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError:
            logger.warning("personio:%s returned non-XML response, skipping", token)
            return []

    out = []
    for position in root.findall("position"):

        def text_of(tag: str) -> str | None:
            el = position.find(tag)
            return el.text.strip() if el is not None and el.text else None

        job_id = text_of("id")
        office = text_of("office")
        employment_type = text_of("employmentType")
        remote_type = "remote" if office and "remote" in office.lower() else "onsite"
        out.append(
            {
                "title": text_of("name") or "",
                "company": token,
                "location": office,
                "remote_type": remote_type,
                "apply_url": f"https://{token}.jobs.personio.de/job/{job_id}" if job_id else None,
                "source": f"personio:{token}",
                "description": text_of("jobDescriptions"),
                "posted_at": text_of("createdAt"),
                "employment_type_hint": employment_type,
            }
        )
    return out


_FETCHERS = {
    "greenhouse": _fetch_greenhouse,
    "lever": _fetch_lever,
    "ashby": _fetch_ashby,
    "smartrecruiters": _fetch_smartrecruiters,
    "recruitee": _fetch_recruitee,
    "personio": _fetch_personio,
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
