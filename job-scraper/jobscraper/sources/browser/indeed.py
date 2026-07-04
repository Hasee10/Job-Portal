"""Indeed - https://www.indeed.com

Indeed's Terms of Service prohibit automated access/scraping. This module
exists because it was explicitly requested, but running it is a ToS
violation and carries real risk (IP bans, legal exposure). Use a residential
SCRAPER_PROXY and keep request volume low.

Selectors below match Indeed's markup as of mid-2026 and WILL break when
Indeed changes their frontend - that's normal for any scraper of a site that
doesn't publish a stable API. If this starts returning 0 jobs, open a job
search in a real browser, inspect a job card, and update SELECTORS.
"""

import logging

from jobscraper.sources.browser.session import attr_or_none, first_match, text_or_none

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.indeed.com/jobs?q={query}&l={location}"
QUERIES = [("software engineer", ""), ("data analyst", ""), ("customer support", "")]

CARD_SELECTORS = ["div.job_seen_beacon", "td.resultContent", "div.cardOutline"]
TITLE_SELECTORS = ["h2.jobTitle span[title]", "h2.jobTitle span", "a.jcs-JobTitle span"]
LINK_SELECTORS = ["h2.jobTitle a", "a.jcs-JobTitle"]
COMPANY_SELECTORS = ['span[data-testid="company-name"]', "span.companyName"]
LOCATION_SELECTORS = ['div[data-testid="text-location"]', "div.companyLocation"]
SNIPPET_SELECTORS = ['div[data-testid="jobsnippet_footer"]', "div.job-snippet"]


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        for query, location in QUERIES:
            url = SEARCH_URL.format(query=query.replace(" ", "+"), location=location)
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                page.wait_for_timeout(1500)
            except Exception:
                logger.warning("indeed: failed to load search page for %r", query)
                continue

            cards = []
            for selector in CARD_SELECTORS:
                cards = page.query_selector_all(selector)
                if cards:
                    break

            for card in cards:
                title_el = first_match(card, TITLE_SELECTORS)
                link_el = first_match(card, LINK_SELECTORS)
                href = attr_or_none(link_el, "href")
                apply_url = (
                    href if href and href.startswith("http") else f"https://www.indeed.com{href}"
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
                        "source": "indeed",
                        "description": text_or_none(first_match(card, SNIPPET_SELECTORS)),
                        "posted_at": None,
                    }
                )
    finally:
        page.close()
    return out
