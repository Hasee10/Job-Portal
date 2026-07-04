"""Jobright.ai - https://jobright.ai

Jobright is primarily an AI job-matching product gated behind account login
for personalized results; its public, logged-out job listing surface is
limited and may change or disappear without notice. This is best-effort:
expect low or zero yield until you confirm what (if anything) is visible
without authentication, and update SEARCH_URL/selectors accordingly.
"""

import logging

from jobscraper.sources.browser.session import attr_or_none, first_match, text_or_none

logger = logging.getLogger(__name__)

SEARCH_URL = "https://jobright.ai/jobs"

CARD_SELECTORS = ['div[class*="job-card"]', 'a[href*="/jobs/"]']
TITLE_SELECTORS = ["h2", "h3", '[class*="title"]']
COMPANY_SELECTORS = ['[class*="company"]']
LOCATION_SELECTORS = ['[class*="location"]']


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        try:
            page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(2000)
        except Exception:
            logger.warning("jobright: failed to load search page")
            return out

        cards = []
        for selector in CARD_SELECTORS:
            cards = page.query_selector_all(selector)
            if cards:
                break

        if not cards:
            logger.info(
                "jobright: no job cards found - listings are likely login-gated"
            )
            return out

        for card in cards:
            title_el = first_match(card, TITLE_SELECTORS)
            title = text_or_none(title_el)
            href = attr_or_none(card, "href") or attr_or_none(
                first_match(card, ['a[href*="/jobs/"]']), "href"
            )
            if not title or not href:
                continue
            apply_url = href if href.startswith("http") else f"https://jobright.ai{href}"

            out.append(
                {
                    "title": title,
                    "company": text_or_none(first_match(card, COMPANY_SELECTORS)) or "",
                    "location": text_or_none(first_match(card, LOCATION_SELECTORS)),
                    "remote_type": "unknown",
                    "apply_url": apply_url,
                    "source": "jobright",
                    "description": None,
                    "posted_at": None,
                }
            )
    finally:
        page.close()
    return out
