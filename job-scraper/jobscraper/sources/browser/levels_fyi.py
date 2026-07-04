"""Levels.fyi - https://www.levels.fyi/jobs

High-credibility source: every listing carries verified salary-band data
(Levels.fyi's whole reputation is built on that), and - confirmed by hand -
"Apply Now" goes straight to the real employer's ATS (Greenhouse/Lever/etc,
e.g. grnh.se/... short links), not a Levels.fyi-hosted middleman page or a
login wall like Dice. No ToS blocker found; page is fully server-rendered,
no anti-bot challenge encountered.

Two-phase scrape, same reasoning as themuse_resolver.py: the listing view
only exposes title/company/location/salary per job, not the real apply
link - that only appears once a job is opened. Opening each job here is a
fast in-page client-side navigation (~1s), not a full page reload, since
Levels.fyi is a single-page app for this view.
"""

import logging
import re

logger = logging.getLogger(__name__)

LIST_URL = "https://www.levels.fyi/jobs?countryCode=US"
JOB_LINK_SELECTOR = 'a[href*="jobId="]'
APPLY_BUTTON_SELECTOR = 'a[class*="applyNowButton"]'
DESCRIPTION_SELECTOR = '[class*="aboutContainer"]'


def _extract_list_items(page) -> list[dict]:
    return page.evaluate(
        """
        () => {
          const groups = document.querySelectorAll('[class*="companyHeaderContainer"]');
          const results = [];
          groups.forEach(group => {
            // Careful: the wrapping span's class also contains the substring
            // "companyName" (companyNameAndPromotedContainer), so a loose
            // [class*="companyName"] selector matches that span first and
            // its textContent includes the "Promoted" badge text too - scope
            // to the h2 specifically.
            const companyEl = group.querySelector('h2[class*="companyName"]');
            const company = companyEl ? companyEl.textContent.trim() : '';
            const jobsContainer = group.parentElement.querySelector('[class*="companyJobsContainer"]');
            if (!jobsContainer) return;
            jobsContainer.querySelectorAll('a[href*="jobId="]').forEach(a => {
              const titleEl = a.querySelector('[class*="companyJobTitle"]');
              const locEl = a.querySelector('[class*="companyJobLocation"]');
              results.push({
                jobId: (a.href.match(/jobId=([^&]+)/) || [])[1] || null,
                title: titleEl ? titleEl.childNodes[0].textContent.trim() : a.textContent.trim(),
                company,
                location: locEl ? locEl.textContent.trim() : null,
              });
            });
          });
          return results;
        }
        """
    )


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        page.goto(LIST_URL, wait_until="domcontentloaded", timeout=25000)
        page.wait_for_timeout(2000)

        items = _extract_list_items(page)
        logger.info("levels_fyi: found %d listed jobs", len(items))

        job_links = page.query_selector_all(JOB_LINK_SELECTOR)
        for idx, item in enumerate(items):
            if not item.get("title") or not item.get("jobId"):
                continue
            if idx >= len(job_links):
                break

            try:
                page.evaluate("(el) => el.click()", job_links[idx])
                page.wait_for_timeout(900)
                apply_el = page.query_selector(APPLY_BUTTON_SELECTOR)
                apply_url = apply_el.get_attribute("href") if apply_el else None
                about_el = page.query_selector(DESCRIPTION_SELECTOR)
                description = about_el.inner_text() if about_el else None
            except Exception:
                logger.debug("levels_fyi: failed to resolve apply URL for jobId=%s", item["jobId"])
                apply_url = None
                description = None

            if not apply_url:
                continue

            location_text = item.get("location") or ""
            parts = [p.strip() for p in location_text.split("·")]
            location = parts[0] if parts else None
            remote_type = "unknown"
            if len(parts) > 1:
                remote_text = parts[1].lower()
                if "remote" in remote_text:
                    remote_type = "remote"
                elif "hybrid" in remote_text:
                    remote_type = "hybrid"
                elif "on-site" in remote_text or "onsite" in remote_text:
                    remote_type = "onsite"

            out.append(
                {
                    "title": item["title"],
                    "company": item.get("company") or "",
                    "location": location,
                    "remote_type": remote_type,
                    "apply_url": apply_url,
                    "source": "levels_fyi",
                    "description": description,
                    "posted_at": None,
                }
            )
    finally:
        page.close()
    return out
