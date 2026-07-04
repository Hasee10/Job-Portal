"""Glassdoor - https://www.glassdoor.com

Glassdoor's Terms of Use prohibit scraping, and the site paywalls most
listing detail behind a login after the first few results even for logged
-out users. Treat this as best-effort/low-volume; it is the most likely of
all sources here to return 0 rows if Glassdoor has changed its interstitials.
"""

import logging

from jobscraper.sources.browser.session import attr_or_none, first_match, text_or_none

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.glassdoor.com/Job/remote-software-engineer-jobs-SRCH_IL.0,6_IS11047_KO7,25.htm"

CARD_SELECTORS = ["li.react-job-listing", 'li[data-test="jobListing"]']
TITLE_SELECTORS = ["a.jobLink", 'a[data-test="job-link"]']
COMPANY_SELECTORS = ["div.employerName", 'span[data-test="employer-name"]']
LOCATION_SELECTORS = ["div.location", 'div[data-test="emp-location"]']


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        try:
            page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(2000)
        except Exception:
            logger.warning("glassdoor: failed to load search page")
            return out

        cards = []
        for selector in CARD_SELECTORS:
            cards = page.query_selector_all(selector)
            if cards:
                break

        for card in cards:
            title_el = first_match(card, TITLE_SELECTORS)
            href = attr_or_none(title_el, "href")
            apply_url = (
                href if href and href.startswith("http") else f"https://www.glassdoor.com{href}"
                if href
                else None
            )
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
                    "source": "glassdoor",
                    "description": None,
                    "posted_at": None,
                }
            )
    finally:
        page.close()
    return out
