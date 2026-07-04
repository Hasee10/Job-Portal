"""ZipRecruiter - https://www.ziprecruiter.com

ZipRecruiter's Terms of Use prohibit automated scraping and it frequently
shows an interstitial/CAPTCHA to non-human traffic even with a stealth
browser - treat this as the lowest-reliability source in the set.
"""

import logging

from jobscraper.sources.browser.session import attr_or_none, first_match, text_or_none

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.ziprecruiter.com/jobs-search?search=software+engineer&location=Remote"

CARD_SELECTORS = ["div.job_content", 'article[class*="job_result"]']
TITLE_SELECTORS = ["h2.job_title", "a.job_link"]
COMPANY_SELECTORS = ["a.hiring_company_text", "span.hiring_company_text"]
LOCATION_SELECTORS = ["p.location", 'span[class*="location"]']


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        try:
            page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(2000)
        except Exception:
            logger.warning("ziprecruiter: failed to load search page")
            return out

        cards = []
        for selector in CARD_SELECTORS:
            cards = page.query_selector_all(selector)
            if cards:
                break

        for card in cards:
            title_el = first_match(card, TITLE_SELECTORS)
            title = text_or_none(title_el)
            href = attr_or_none(title_el, "href") or attr_or_none(
                first_match(card, ["a"]), "href"
            )
            if not title or not href:
                continue
            apply_url = href if href.startswith("http") else f"https://www.ziprecruiter.com{href}"

            out.append(
                {
                    "title": title,
                    "company": text_or_none(first_match(card, COMPANY_SELECTORS)) or "",
                    "location": text_or_none(first_match(card, LOCATION_SELECTORS)),
                    "remote_type": "unknown",
                    "apply_url": apply_url,
                    "source": "ziprecruiter",
                    "description": None,
                    "posted_at": None,
                }
            )
    finally:
        page.close()
    return out
