"""NaukriGulf - https://www.naukrigulf.com

No documented public API. The site's own search pages call a JSON endpoint
(`/spapi/jobapi/search`) to render results, found by watching network
traffic while browsing a search page (2026-07). A single query with no
location filter already spans every Gulf country NaukriGulf covers (UAE,
Saudi Arabia, Qatar, Kuwait, Bahrain, plus a handful outside the Gulf), so
this only needs to loop NAUKRIGULF_KEYWORDS, not a keyword x country matrix.

Lives under sources/browser/ (not a plain httpx module) for two stacked
reasons, both confirmed live 2026-07:
1. The endpoint requires a fixed set of app-identifying headers (appid,
   systemid, clientid, etc - copied from the real request below) or it
   400s with "Please provide the valid App Id and SystemId in Header."
2. Even with those headers, a plain httpx client hangs/times out - it needs
   a real browser context, same as gulftalent.py - so this calls the JSON
   endpoint via page.evaluate(fetch(...)) instead of parsing HTML.

Same ToS caveat as the other directly-scraped ME boards (Bayt, GulfTalent):
not an official partner API, just the JSON the frontend itself consumes.
Applications go through NaukriGulf's own job page (isFormBasedApply is true
on postings sampled), not the employer directly - same aggregator-fallback
pattern as RemoteOK/Himalayas/Bayt/GulfTalent.
"""

import logging
from datetime import datetime, timezone

from jobscraper import config

logger = logging.getLogger(__name__)

SEARCH_PAGE_URL = "https://www.naukrigulf.com/procurement-jobs"
JOB_BASE_URL = "https://www.naukrigulf.com"

# The API 400s without these - copied verbatim from a real browser request
# to the same endpoint (locationid/userdata are accepted blank).
_API_HEADERS = {
    "appid": "205",
    "systemid": "2323",
    "accept": "application/json",
    "accept-format": "strict",
    "clientid": "desktop",
    "client-type": "desktop",
    "puppeteer": "false",
    "version": "v1",
}

# Server-enforced cap: "Offset must be lesser than 45000 and limit must be
# lesser than 50" (confirmed live 2026-07).
_PAGE_LIMIT = 49

_FETCH_JS = """async (args) => {
    const params = new URLSearchParams({
        Keywords: args.keyword,
        Limit: args.limit,
        Offset: 0,
        pageNo: 1,
        seo: 1,
    });
    const resp = await fetch('/spapi/jobapi/search?' + params.toString(), {
        headers: args.headers,
    });
    if (!resp.ok) {
        throw new Error('naukrigulf api status ' + resp.status);
    }
    const data = await resp.json();
    return data.jobs || [];
}"""


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        try:
            page.goto(SEARCH_PAGE_URL, wait_until="domcontentloaded", timeout=20000)
        except Exception:
            logger.warning("naukrigulf: failed to load search page")
            return out

        raw_jobs = []
        seen_ids: set[str] = set()
        for keywords in config.NAUKRIGULF_KEYWORDS:
            try:
                results = page.evaluate(
                    _FETCH_JS, {"keyword": keywords, "limit": _PAGE_LIMIT, "headers": _API_HEADERS}
                )
            except Exception:
                logger.exception(
                    "naukrigulf: query keywords=%r failed, skipping this keyword", keywords
                )
                continue

            for job in results or []:
                job_id = job.get("jobId")
                if job_id and job_id in seen_ids:
                    continue
                if job_id:
                    seen_ids.add(job_id)
                raw_jobs.append(job)

        for job in raw_jobs:
            jd_url = job.get("jdURL")
            title = (job.get("designation") or "").strip()
            if not jd_url or not title:
                continue

            company = ((job.get("company") or {}).get("name") or "").strip()

            posted_at = None
            posted_ts = job.get("latestPostedDate")
            if posted_ts:
                try:
                    posted_at = datetime.fromtimestamp(int(posted_ts), tz=timezone.utc).isoformat()
                except (ValueError, OSError):
                    posted_at = None

            out.append(
                {
                    "title": title,
                    "company": company,
                    "location": (job.get("location") or "").strip() or None,
                    "remote_type": "unknown",
                    "apply_url": f"{JOB_BASE_URL}/{jd_url}",
                    "source": "naukrigulf",
                    "description": job.get("description") or job.get("jobInfo"),
                    "posted_at": posted_at,
                }
            )
    finally:
        page.close()
    return out
