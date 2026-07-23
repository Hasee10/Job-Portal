"""Bayt.com - https://www.bayt.com

No public API. Search results are plain server-rendered HTML at
`/en/{country-slug}/jobs/{keyword-slug}-jobs/?page=N` (verified live 2026-07
for uae/saudi-arabia/qatar/kuwait/bahrain/oman/jordan/lebanon/iraq/syria/
palestine and for multi-word keyword slugs like "supply-chain-jobs"). Unlike
GulfTalent/NaukriGulf, one query does NOT span every country - Bayt scopes
results to the country in the URL path - so this runs the
BAYT_COUNTRIES x BAYT_KEYWORDS matrix like Adzuna/Jooble, capped at
BAYT_MAX_PAGES pages per combo to keep runtime bounded.

Lives under sources/browser/ (not a plain httpx module) because Bayt's own
robots.txt/ToS treats automated access the same as the other directly-scraped
ME boards (GulfTalent, NaukriGulf) - real browser fingerprint reduces the
chance of an IP-level block plain httpx would hit immediately.

apply_url is Bayt's own job detail page (`/en/{country}/jobs/{title-slug}-id/`),
not the `/en/register-j/?jb_id=...` "Easy Apply" registration-flow URL - the
detail page is a stable, human-readable landing page and matches the
aggregator-fallback pattern used by RemoteOK/Himalayas/GulfTalent/NaukriGulf,
while register-j is a login/signup wall, not a place someone would click
through from a job listing.
"""

import logging
from datetime import datetime, timezone

from jobscraper import config
from jobscraper.sources.browser.session import attr_or_none, text_or_none

logger = logging.getLogger(__name__)

BASE_URL = "https://www.bayt.com"

CARD_SELECTOR = "li[data-js-job]"
TITLE_SELECTOR = 'h2 a[data-js-aid="jobID"]'
COMPANY_SELECTOR = ".job-company-location-wrapper > div:first-child a"
LOCATION_SELECTOR = ".job-company-location-wrapper .t-mute"
DESCRIPTION_SELECTOR = ".jb-descr"
DATE_SELECTOR = ".jb-date span[data-automation-jobactivedate]"


def _keyword_slug(keywords: str) -> str:
    return keywords.strip().lower().replace(" ", "-")


def _fetch_page(page, country: str, keyword_slug: str, page_num: int) -> list[dict]:
    url = f"{BASE_URL}/en/{country}/jobs/{keyword_slug}-jobs/"
    if page_num > 1:
        url += f"?page={page_num}"
    page.goto(url, wait_until="domcontentloaded", timeout=20000)

    out = []
    for card in page.query_selector_all(CARD_SELECTOR):
        title_el = card.query_selector(TITLE_SELECTOR)
        href = attr_or_none(title_el, "href")
        title = text_or_none(title_el)
        if not title or not href:
            continue

        date_el = card.query_selector(DATE_SELECTOR)
        posted_at = None
        posted_ts = attr_or_none(date_el, "data-automation-jobactivedate")
        if posted_ts:
            try:
                posted_at = datetime.fromtimestamp(int(posted_ts), tz=timezone.utc).isoformat()
            except (ValueError, OSError):
                posted_at = None

        out.append(
            {
                "title": title,
                "company": text_or_none(card.query_selector(COMPANY_SELECTOR)) or "",
                "location": text_or_none(card.query_selector(LOCATION_SELECTOR)),
                "remote_type": "unknown",
                "apply_url": href if href.startswith("http") else f"{BASE_URL}{href}",
                "source": "bayt",
                "description": text_or_none(card.query_selector(DESCRIPTION_SELECTOR)),
                "posted_at": posted_at,
            }
        )
    return out


def fetch(browser) -> list[dict]:
    out = []
    seen_urls: set[str] = set()
    page = browser.new_page()
    try:
        for country in config.BAYT_COUNTRIES:
            for keywords in config.BAYT_KEYWORDS:
                keyword_slug = _keyword_slug(keywords)
                for page_num in range(1, config.BAYT_MAX_PAGES + 1):
                    try:
                        jobs = _fetch_page(page, country, keyword_slug, page_num)
                    except Exception:
                        logger.exception(
                            "bayt: query country=%r keywords=%r page=%d failed, skipping",
                            country,
                            keywords,
                            page_num,
                        )
                        break

                    if not jobs:
                        break

                    for job in jobs:
                        if job["apply_url"] in seen_urls:
                            continue
                        seen_urls.add(job["apply_url"])
                        out.append(job)
    finally:
        page.close()
    return out
