"""GulfTalent - https://www.gulftalent.com

No documented public API. The site's own search page calls a plain JSON
endpoint (`/api/jobs/search`) to render results, found by watching network
traffic while using the site's search box (2026-07) - a single query with no
country filter returns jobs across every country GulfTalent covers (UAE,
Saudi Arabia, Qatar, Kuwait, Oman, Bahrain, plus a handful outside the
Gulf), so this only needs to loop GULFTALENT_KEYWORDS, not a keyword x
country matrix like Adzuna/Jooble.

This lives under sources/browser/ (not a plain httpx module like
adzuna.py/jooble.py) because the endpoint sits behind bot-detection that
403s a plain httpx client even with browser-matching headers (verified
2026-07 - Access Denied, Akamai reference id in the response) but succeeds
from inside a real browser context. So this calls the JSON endpoint via
page.evaluate(fetch(...)) instead of parsing HTML - keeps the same
structured-data win as a real API source while running through
CloakBrowser like the rest of this package.

Same ToS caveat as the other directly-scraped ME boards (Bayt, NaukriGulf):
not an official partner API, just the JSON the frontend itself consumes.
Applications go through GulfTalent's own job page (has_external_application
is false on every job sampled), not the employer directly - same
aggregator-fallback pattern as RemoteOK/Himalayas/Bayt.
"""

import logging
from datetime import datetime, timezone

from jobscraper import config

logger = logging.getLogger(__name__)

SEARCH_PAGE_URL = "https://www.gulftalent.com/uae/jobs"
JOB_BASE_URL = "https://www.gulftalent.com"

_FETCH_JS = """async (keyword) => {
    const params = new URLSearchParams({
        search_keyword: keyword,
        search_order: 'r',
        limit: 100,
        offset: 0,
        version: 2,
    });
    const resp = await fetch('/api/jobs/search?' + params.toString());
    if (!resp.ok) {
        throw new Error('gulftalent api status ' + resp.status);
    }
    const data = await resp.json();
    return (data.results && data.results.data) || [];
}"""


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        try:
            page.goto(SEARCH_PAGE_URL, wait_until="domcontentloaded", timeout=20000)
        except Exception:
            logger.warning("gulftalent: failed to load search page")
            return out

        raw_jobs = []
        seen_ids: set[int] = set()
        for keywords in config.GULFTALENT_KEYWORDS:
            try:
                results = page.evaluate(_FETCH_JS, keywords)
            except Exception:
                logger.exception(
                    "gulftalent: query keywords=%r failed, skipping this keyword", keywords
                )
                continue

            for job in results or []:
                job_id = job.get("id")
                if job_id and job_id in seen_ids:
                    continue
                if job_id:
                    seen_ids.add(job_id)
                raw_jobs.append(job)

        for job in raw_jobs:
            link = job.get("link")
            if not link:
                continue

            title = (job.get("title") or "").strip()
            is_remote = bool(job.get("is_remote"))

            posted_at = None
            posted_ts = job.get("posted_date_ts")
            if posted_ts:
                try:
                    posted_at = datetime.fromtimestamp(int(posted_ts), tz=timezone.utc).isoformat()
                except (ValueError, OSError):
                    posted_at = None

            description_bits = [
                bit for bit in (job.get("category_name"), job.get("industry_name")) if bit
            ]
            company = (job.get("company_name") or job.get("jb_company_name") or "").strip()

            if not title:
                continue

            out.append(
                {
                    "title": title,
                    "company": company,
                    "location": (job.get("location") or "").strip() or None,
                    "remote_type": "remote" if is_remote else "onsite",
                    "apply_url": f"{JOB_BASE_URL}{link}",
                    "source": "gulftalent",
                    "description": " · ".join(description_bits) or None,
                    "posted_at": posted_at,
                }
            )
    finally:
        page.close()
    return out
