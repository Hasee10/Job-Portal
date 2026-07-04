"""The Muse - https://www.themuse.com/developers/api/v2 (keyless, paginated)."""

from datetime import datetime

from jobscraper.sources.base import get_client, keep_valid

URL = "https://www.themuse.com/api/public/jobs"
PAGES = (0, 1, 2)


def fetch() -> list[dict]:
    out = []
    with get_client() as client:
        for page in PAGES:
            resp = client.get(URL, params={"page": page})
            resp.raise_for_status()
            results = resp.json().get("results", [])

            for job in results:
                locations = job.get("locations") or []
                location_text = ", ".join(loc.get("name", "") for loc in locations if loc)
                text = f"{job.get('name') or ''} {location_text}".lower()

                posted_at = None
                if job.get("publication_date"):
                    try:
                        posted_at = datetime.fromisoformat(
                            job["publication_date"].replace("Z", "+00:00")
                        ).isoformat()
                    except ValueError:
                        posted_at = None

                out.append(
                    {
                        "title": (job.get("name") or "").strip(),
                        "company": ((job.get("company") or {}).get("name") or "").strip(),
                        "location": location_text or None,
                        "remote_type": "remote"
                        if ("flexible" in text or "remote" in text)
                        else "onsite",
                        "apply_url": (job.get("refs") or {}).get("landing_page"),
                        "source": "themuse",
                        "description": job.get("contents") or None,
                        "posted_at": posted_at,
                    }
                )
    return keep_valid(out)
