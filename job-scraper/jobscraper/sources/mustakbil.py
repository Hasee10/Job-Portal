"""Mustakbil - https://www.mustakbil.com/jobs (Pakistan)

Angular Universal server-side-rendered HTML - the full job list is present
in the initial plain HTTP response (confirmed live 2026-07), no CloakBrowser
needed despite being an Angular SPA client-side. No true page-number
pagination was found (?page=N returns 410 Gone) - the site instead exposes
per-city listing paths that each return a different set of postings, used
here as the "pages" to enumerate for breadth.

Card markup uses Material Symbols icon font ligatures as literal text
inside <i> tags (e.g. the text content of an icon element is the literal
word "payments" or "work") - these get stripped before reading badge text,
otherwise "Full Time" comes out as "work Full Time".
"""

import logging
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)

BASE_URL = "https://www.mustakbil.com"
CITY_PATHS = [
    "/jobs/pakistan",
    "/jobs/pakistan/karachi",
    "/jobs/pakistan/lahore",
    "/jobs/pakistan/islamabad",
    "/jobs/pakistan/rawalpindi",
    "/jobs/pakistan/faisalabad",
    "/jobs/pakistan/multan",
    "/jobs/pakistan/peshawar",
]
TILE_SELECTOR = ".job-card"


def _clean_text(el) -> str | None:
    """Strips <i> icon-ligature tags before reading text - their text
    content is the icon's literal name (e.g. "work", "payments"), not part
    of the real label.
    """
    if el is None:
        return None
    for icon in el.select("i"):
        icon.decompose()
    text = el.get_text(" ", strip=True)
    return text or None


def _parse_tile(tile) -> dict | None:
    title_link = tile.select_one(".job-title__link")
    title = title_link.get_text(strip=True) if title_link else None
    href = title_link.get("href") if title_link else None
    apply_url = urljoin(BASE_URL, href) if href else None
    if not title or not apply_url:
        return None

    company = _clean_text(tile.select_one(".job-company"))
    location = _clean_text(tile.select_one(".job-location"))
    employment_type = _clean_text(tile.select_one(".job-badge--type"))
    employment_type_hint = employment_type.lower().replace(" ", "_") if employment_type else None
    description = tile.select_one(".job-desc")
    description = description.get_text(" ", strip=True) if description else None

    return {
        "title": title,
        "company": company if company and company != "Confidential" else None,
        "location": location,
        "remote_type": "onsite" if location else "unknown",
        "apply_url": apply_url,
        "source": "mustakbil",
        "description": description,
        "posted_at": None,
        "employment_type_hint": employment_type_hint,
    }


def fetch() -> list[dict]:
    out = []
    seen_urls: set[str] = set()
    with get_client() as client:
        for path in CITY_PATHS:
            try:
                resp = client.get(urljoin(BASE_URL, path))
                resp.raise_for_status()
            except Exception:
                logger.warning("mustakbil: failed to load %s", path)
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            tiles = soup.select(TILE_SELECTOR)
            if not tiles:
                logger.warning("mustakbil: 0 job tiles for %s - selectors may need updating", path)
                continue

            for tile in tiles:
                job = _parse_tile(tile)
                if job is None or job["apply_url"] in seen_urls:
                    continue
                seen_urls.add(job["apply_url"])
                out.append(job)
    return keep_valid(out)
