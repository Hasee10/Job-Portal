"""Upwork - https://www.upwork.com

Public job search results, reachable without login via CloakBrowser (an
initial Cloudflare "Just a moment..." challenge clears after a few seconds
with humanize=True - confirmed live 2026-07). Every posting here is
genuinely freelance/contract work, so `employment_type_hint` is set to
"freelance" directly rather than guessed from title text - classify.py
trusts this over its title regex (see jobscraper/classify.py).

LEGAL NOTE: Upwork's Terms of Service prohibit automated scraping, same
category of risk as Indeed/Glassdoor/Naukri/ZipRecruiter in this same
BROWSER_SOURCES list - a deliberate choice, not a default (see the module
docstring in jobscraper/sources/browser/__init__.py).

Client identity isn't shown in search results (Upwork anonymizes it until
you're a logged-in freelancer viewing the full posting), so `company` is a
fixed placeholder rather than fabricated. Location is unset - these are
overwhelmingly remote/work-from-anywhere by the nature of the platform.

Closed/awarded contracts don't reliably 404 or 410 for a script - the pages
are Cloudflare-gated, so the shared sweeper's plain-HTTP liveness check
would either wrongly deactivate everything or (once enough of a run's
checks come back ambiguous) skip Upwork entirely via its source-block
detection in sweeper.py. A job disappearing from a fresh search fetch is
Upwork's own real "no longer open" signal instead - see
db.mark_missing_from_source(), called from pipeline.run() specifically for
this source.
"""

import logging
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

BASE_URL = "https://www.upwork.com"
SEARCH_URL = "https://www.upwork.com/nx/search/jobs/?q={query}&sort=recency&page={page}"

# A representative spread of common freelance categories - broad enough to
# surface real variety without the runtime cost of enumerating every Upwork
# category page. Expand this list once a real run confirms selectors/volume
# look right.
SEARCH_QUERIES = [
    "python",
    "javascript",
    "web development",
    "virtual assistant",
    "content writing",
    "graphic design",
    "data entry",
    "wordpress",
    "video editing",
    "mobile app developer",
]
PAGES = (1, 2)

TILE_SELECTOR = 'article[data-test="JobTile"]'


def _text_or_none(el) -> str | None:
    if el is None:
        return None
    text = el.inner_text().strip()
    return text or None


def _parse_tile(tile) -> dict | None:
    link = tile.query_selector('a[data-test~="job-tile-title-link"]')
    href = link.get_attribute("href") if link else None
    title = _text_or_none(link)
    if not title or not href:
        return None

    # Strip the ?referrer_url_path=... query string - the path (including
    # the ~<job-id> suffix) is the stable, unique part of the URL.
    apply_url = urljoin(BASE_URL, href.split("?")[0])

    job_type_label = _text_or_none(tile.query_selector('[data-test="job-type-label"]'))
    experience_level = _text_or_none(tile.query_selector('[data-test="experience-level"]'))
    budget = _text_or_none(tile.query_selector('[data-test="is-fixed-price"]'))
    description = _text_or_none(tile.query_selector('[data-test*="JobDescription"]'))

    summary = " · ".join(p for p in (job_type_label, experience_level, budget) if p)
    full_description = f"{summary}\n\n{description}" if description else (summary or None)

    return {
        "title": title,
        "company": "Upwork Client",
        "location": None,
        "remote_type": "remote",
        "apply_url": apply_url,
        "source": "upwork",
        "description": full_description,
        "posted_at": None,
        "employment_type_hint": "freelance",
    }


def fetch(browser) -> list[dict]:
    out = []
    seen_urls: set[str] = set()
    page = browser.new_page()
    try:
        for query in SEARCH_QUERIES:
            for page_num in PAGES:
                try:
                    page.goto(
                        SEARCH_URL.format(query=query.replace(" ", "+"), page=page_num),
                        wait_until="domcontentloaded",
                        timeout=20000,
                    )
                    # The Cloudflare interstitial ("Just a moment...") needs
                    # a few seconds to clear before real content is present -
                    # it can still be navigating/redirecting after this wait
                    # returns, which is why the DOM query below is inside
                    # this same try block (a query against a page mid-
                    # navigation raises "Execution context was destroyed").
                    page.wait_for_timeout(4000)

                    tiles = page.query_selector_all(TILE_SELECTOR)
                    if not tiles:
                        logger.warning(
                            "upwork: 0 job tiles for %r page %d - selectors may "
                            "need updating or the Cloudflare challenge didn't clear",
                            query,
                            page_num,
                        )
                        continue

                    for tile in tiles:
                        job = _parse_tile(tile)
                        if job is None or job["apply_url"] in seen_urls:
                            continue
                        seen_urls.add(job["apply_url"])
                        out.append(job)
                except Exception:
                    logger.warning(
                        "upwork: failed to load/parse %r page %d", query, page_num
                    )
                    continue
    finally:
        page.close()
    return out
