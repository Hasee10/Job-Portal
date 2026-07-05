"""BrightSpyre - https://resume.brightspyre.com/jobs (Pakistan)

Plain server-rendered HTML with real schema.org RDFa microdata
(vocab="http://schema.org/" typeof="JobPosting") baked into every listing -
no JS rendering needed, no login wall, no Cloudflare. Confirmed live 2026-07
via a plain httpx GET.

Each posting has real employmentType/datePosted/hiringOrganization fields,
so employment_type_hint is set from the site's own data rather than guessed
from the title (see jobscraper/classify.py).
"""

import logging
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)

BASE_URL = "https://resume.brightspyre.com"
LIST_URL = "https://resume.brightspyre.com/jobs?page={page}"
PAGES = range(1, 11)
TILE_SELECTOR = "[typeof=JobPosting]"


def _text(el) -> str | None:
    if el is None:
        return None
    text = el.get_text(" ", strip=True)
    return text if text and text != "-" else None


def _parse_tile(tile) -> dict | None:
    title_el = tile.select_one("[property=title]")
    title = _text(title_el)
    if title and title.startswith("Apply Now"):
        title = title[len("Apply Now") :].strip()

    link = tile.select_one("a[href^='/jobs/']")
    apply_url = urljoin(BASE_URL, link["href"]) if link else None
    if not title or not apply_url:
        return None

    company = _text(tile.select_one("[property=hiringOrganization]"))
    locality = _text(tile.select_one("[property=addressLocality]"))
    region = _text(tile.select_one("[property=addressRegion]"))
    location = ", ".join(p for p in (locality, region) if p) or None

    employment_type = _text(tile.select_one("[property=employmentType]"))
    employment_type_hint = employment_type.lower().replace(" ", "_") if employment_type else None

    posted_at = _text(tile.select_one("[property=datePosted]"))
    description = _text(tile.select_one("[property=description]"))

    return {
        "title": title,
        "company": company,
        "location": location,
        "remote_type": "onsite" if location else "unknown",
        "apply_url": apply_url,
        "source": "brightspyre",
        "description": description,
        "posted_at": posted_at,
        "employment_type_hint": employment_type_hint,
    }


def fetch() -> list[dict]:
    out = []
    with get_client() as client:
        for page_num in PAGES:
            try:
                resp = client.get(LIST_URL.format(page=page_num))
                resp.raise_for_status()
            except Exception:
                logger.warning("brightspyre: failed to load page %d", page_num)
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            tiles = soup.select(TILE_SELECTOR)
            if not tiles:
                # Ran past the last page of results - stop rather than keep
                # requesting empty pages.
                break

            for tile in tiles:
                job = _parse_tile(tile)
                if job:
                    out.append(job)
    return keep_valid(out)
