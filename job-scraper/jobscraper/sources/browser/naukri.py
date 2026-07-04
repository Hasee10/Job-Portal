"""Naukri.com - https://www.naukri.com

Naukri's Terms of Use prohibit automated scraping. Popular for the
Pakistan/India job market, which is why it was requested here.
"""

import logging

from jobscraper.sources.browser.session import attr_or_none, first_match, text_or_none

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.naukri.com/software-developer-jobs"

CARD_SELECTORS = ["article.jobTuple", "div.cust-job-tuple"]
TITLE_SELECTORS = ["a.title", "a.title.ellipsis"]
COMPANY_SELECTORS = ["a.subTitle", "a.comp-name"]
LOCATION_SELECTORS = ["li.location span", 'span[title][class*="locWdth"]']
SNIPPET_SELECTORS = ["div.job-description", "span.job-desc"]


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        try:
            page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(2000)
        except Exception:
            logger.warning("naukri: failed to load search page")
            return out

        cards = []
        for selector in CARD_SELECTORS:
            cards = page.query_selector_all(selector)
            if cards:
                break

        for card in cards:
            title_el = first_match(card, TITLE_SELECTORS)
            apply_url = attr_or_none(title_el, "href")
            title = text_or_none(title_el)
            if not title or not apply_url:
                continue

            out.append(
                {
                    "title": title,
                    "company": text_or_none(first_match(card, COMPANY_SELECTORS)) or "",
                    "location": text_or_none(first_match(card, LOCATION_SELECTORS)),
                    "remote_type": "unknown",
                    "apply_url": apply_url,
                    "source": "naukri",
                    "description": text_or_none(first_match(card, SNIPPET_SELECTORS)),
                    "posted_at": None,
                }
            )
    finally:
        page.close()
    return out
