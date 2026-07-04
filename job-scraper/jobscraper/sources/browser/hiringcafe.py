"""hiring.cafe - https://hiring.cafe

AI-aggregated job board (~3.3M jobs, ~110k companies), server-rendered via
Next.js, no login wall and no ToS language prohibiting automated access as
of writing. Lowest-risk of the browser-based sources here.

Job data ships embedded in the page's __NEXT_DATA__ blob at
props.pageProps.ssrHits (an Algolia-style search hit list) - confirmed live
2026-07 by inspecting https://hiring.cafe/?page=0. This is far more stable
than scraping rendered card markup, since it's the same JSON the page's own
React code consumes.
"""

import json
import logging

logger = logging.getLogger(__name__)

SEARCH_URL = "https://hiring.cafe/?page={page}"
PAGES = (0, 1, 2)


def _parse_hits(page) -> list[dict] | None:
    script = page.query_selector("script#__NEXT_DATA__")
    if script is None:
        return None
    try:
        data = json.loads(script.inner_text())
        hits = data["props"]["pageProps"]["ssrHits"]
    except (ValueError, TypeError, KeyError):
        return None
    if not isinstance(hits, list):
        return None

    out = []
    for hit in hits:
        if not isinstance(hit, dict) or hit.get("is_expired"):
            continue
        title = ((hit.get("job_information") or {}).get("title") or "").strip()
        apply_url = hit.get("apply_url")
        if not title or not apply_url:
            continue

        company = ((hit.get("enriched_company_data") or {}).get("name") or "").strip()
        job_data = hit.get("v5_processed_job_data") or {}
        workplace_type = (job_data.get("workplace_type") or "").lower()
        remote_type = workplace_type if workplace_type in ("remote", "hybrid", "onsite") else "unknown"
        location = ", ".join(job_data.get("workplace_cities") or []) or None

        out.append(
            {
                "title": title,
                "company": company,
                "location": location,
                "remote_type": remote_type,
                "apply_url": apply_url,
                "source": "hiringcafe",
                "description": job_data.get("requirements_summary") or None,
                "posted_at": None,
            }
        )
    return out


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        for page_num in PAGES:
            try:
                page.goto(
                    SEARCH_URL.format(page=page_num),
                    wait_until="domcontentloaded",
                    timeout=20000,
                )
                page.wait_for_timeout(1500)
            except Exception:
                logger.warning("hiringcafe: failed to load page %d", page_num)
                continue

            jobs = _parse_hits(page)
            if jobs is None:
                logger.warning(
                    "hiringcafe: __NEXT_DATA__/ssrHits shape changed, got 0 jobs "
                    "from page %d - selectors need updating",
                    page_num,
                )
                continue
            out.extend(jobs)
    finally:
        page.close()
    return out
