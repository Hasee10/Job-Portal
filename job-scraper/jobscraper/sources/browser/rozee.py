"""Rozee.pk - https://www.rozee.pk (Pakistan's largest job board)

Cloudflare-gated (a JS challenge redirect, "Just a moment..." style) -
clears after ~10-12 seconds with CloakBrowser's humanize=True, longer than
Upwork's challenge needed. Confirmed live 2026-07.

LEGAL NOTE: same category of risk as Indeed/Glassdoor/Upwork/etc in this
BROWSER_SOURCES list - Rozee.pk's ToS were not found to explicitly permit
automated scraping. Deliberate choice, not a default - see the module
docstring in jobscraper/sources/browser/__init__.py.

No page-number pagination was found in the rendered markup (results appear
to load further pages via a JS-triggered mechanism, not a plain URL param) -
this enumerates a handful of broad search-term queries instead, same
breadth-via-category-query approach as upwork.py.
"""

import logging
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

BASE_URL = "https://www.rozee.pk"
SEARCH_URL = "https://www.rozee.pk/job/jsearch/q/{query}"

SEARCH_QUERIES = [
    "all",
    "software",
    "sales",
    "marketing",
    "accounts",
    "customer-service",
    "teaching",
    "engineering",
    "hr",
    "graphic-designer",
]

TILE_SELECTOR = "div.job"


def _text_or_none(el) -> str | None:
    if el is None:
        return None
    text = el.inner_text().strip()
    return text or None


def _parse_tile(tile) -> dict | None:
    title_el = tile.query_selector("h3.s-18 a")
    href = title_el.get_attribute("href") if title_el else None
    title = _text_or_none(title_el)
    if not title or not href:
        return None

    apply_url = urljoin(BASE_URL, href.split("?")[0])

    # .cname's individual <a> fragments each carry their own stray comma
    # (e.g. "Computer House,", "Karachi", ", Pakistan") - strip each piece's
    # own punctuation/whitespace before rejoining, rather than naively
    # concatenating them.
    cname_links = tile.query_selector_all(".cname a")
    cname_parts = [
        (_text_or_none(a) or "").strip(" ,") for a in cname_links
    ]
    cname_parts = [p for p in cname_parts if p]
    company = cname_parts[0] if cname_parts else None
    location = ", ".join(cname_parts[1:]) or None

    description = _text_or_none(tile.query_selector(".jbody"))
    posted_at_raw = _text_or_none(tile.query_selector(".jfooter span"))

    return {
        "title": title,
        "company": company,
        "location": location,
        "remote_type": "onsite" if location else "unknown",
        "apply_url": apply_url,
        "source": "rozee",
        "description": description,
        "posted_at": None,  # posted_at_raw is a display string like "Jul 03, 2026", not reliably parseable
    }


def fetch(browser) -> list[dict]:
    out = []
    seen_urls: set[str] = set()
    page = browser.new_page()
    try:
        for query in SEARCH_QUERIES:
            try:
                page.goto(
                    SEARCH_URL.format(query=query),
                    wait_until="domcontentloaded",
                    timeout=30000,
                )
                # Rozee's Cloudflare challenge takes noticeably longer to
                # clear than Upwork's - 12s was reliable in live testing.
                page.wait_for_timeout(12000)

                tiles = page.query_selector_all(TILE_SELECTOR)
                if not tiles:
                    logger.warning(
                        "rozee: 0 job tiles for %r - selectors may need "
                        "updating or the Cloudflare challenge didn't clear",
                        query,
                    )
                    continue

                for tile in tiles:
                    job = _parse_tile(tile)
                    if job is None or job["apply_url"] in seen_urls:
                        continue
                    seen_urls.add(job["apply_url"])
                    out.append(job)
            except Exception:
                logger.warning("rozee: failed to load/parse %r", query)
                continue
    finally:
        page.close()
    return out
