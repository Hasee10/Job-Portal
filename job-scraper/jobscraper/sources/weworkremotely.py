"""WeWorkRemotely - https://weworkremotely.com/categories/remote-programming-jobs.rss

RSS, not JSON. Title comes as "Company: Job Title" and gets split here.
"""

import feedparser

FEED_URL = "https://weworkremotely.com/categories/remote-programming-jobs.rss"


def fetch() -> list[dict]:
    feed = feedparser.parse(FEED_URL)

    out = []
    for entry in feed.entries:
        title_full = entry.get("title", "")
        split_idx = title_full.find(":")
        if split_idx > -1:
            company = title_full[:split_idx].strip()
            title = title_full[split_idx + 1 :].strip()
        else:
            company = None
            title = title_full.strip()

        apply_url = entry.get("link")
        if not title or not apply_url:
            continue

        posted_at = None
        if entry.get("published"):
            try:
                import email.utils

                parsed = email.utils.parsedate_to_datetime(entry["published"])
                posted_at = parsed.isoformat()
            except (TypeError, ValueError):
                posted_at = None

        out.append(
            {
                "title": title,
                "company": company,
                "location": None,
                "remote_type": "remote",
                "apply_url": apply_url,
                "source": "weworkremotely",
                "description": entry.get("summary") or None,
                "posted_at": posted_at,
            }
        )
    return out
