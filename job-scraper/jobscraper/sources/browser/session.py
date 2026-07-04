"""Shared CloakBrowser session for all browser-rendered sources.

One browser instance is launched per pipeline run and reused across every
source in BROWSER_SOURCES, then closed - avoids paying Chromium startup cost
per site.
"""

import logging
from contextlib import contextmanager

from cloakbrowser import launch

from jobscraper import config

logger = logging.getLogger(__name__)


@contextmanager
def browser_session():
    kwargs = {
        "headless": True,
        "geoip": bool(config.SCRAPER_PROXY),
        "humanize": True,
    }
    if config.SCRAPER_PROXY:
        kwargs["proxy"] = config.SCRAPER_PROXY
    if config.CLOAKBROWSER_LICENSE_KEY:
        kwargs["license_key"] = config.CLOAKBROWSER_LICENSE_KEY

    browser = launch(**kwargs)
    try:
        yield browser
    finally:
        browser.close()


def text_or_none(el) -> str | None:
    if el is None:
        return None
    text = el.inner_text().strip()
    return text or None


def first_match(page_or_el, selectors: list[str]):
    for selector in selectors:
        el = page_or_el.query_selector(selector)
        if el is not None:
            return el
    return None


def attr_or_none(el, name: str) -> str | None:
    if el is None:
        return None
    value = el.get_attribute(name)
    return value.strip() if value else None
