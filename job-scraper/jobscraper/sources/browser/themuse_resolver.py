"""Resolves The Muse's real external apply URL for jobs collected via
themuse.py's plain API fetch.

The Muse's public API only exposes `refs.landing_page`, a themuse.com page -
never the actual employer application URL. Verified by hand: that page has
an "Apply on company site" button which is a JS-driven <button> (not a
static <a href>) that opens the real destination in a new tab via a click
handler - there is no way to read the destination without actually clicking
it in a real browser.
"""

import logging

logger = logging.getLogger(__name__)

APPLY_BUTTON_SELECTOR = 'button:has-text("Apply on company site")'


def resolve_themuse_apply_urls(browser, muse_jobs: list[dict]) -> None:
    """Mutates each job's apply_url in place when resolution succeeds."""
    if not muse_jobs:
        return

    resolved = 0
    for job in muse_jobs:
        themuse_url = job.get("apply_url")
        if not themuse_url:
            continue

        page = browser.new_page()
        try:
            page.goto(themuse_url, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(1000)

            button = page.query_selector(APPLY_BUTTON_SELECTOR)
            if button is None:
                continue

            try:
                with page.expect_popup(timeout=8000) as popup_info:
                    page.eval_on_selector(APPLY_BUTTON_SELECTOR, "el => el.click()")
                popup = popup_info.value
                popup.wait_for_load_state("domcontentloaded", timeout=10000)
                if "themuse.com" not in popup.url:
                    job["apply_url"] = popup.url
                    resolved += 1
                popup.close()
            except Exception:
                logger.debug("themuse: apply-button click didn't open a popup for %s", themuse_url)
        except Exception:
            logger.debug("themuse: failed to resolve apply URL for %s", themuse_url)
        finally:
            page.close()

    logger.info("themuse: resolved %d/%d real apply URLs", resolved, len(muse_jobs))
