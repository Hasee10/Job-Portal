"""Remotive - https://remotive.com/api-documentation (keyless)."""

from datetime import datetime, timezone

from jobscraper.sources.base import get_client, keep_valid

URL = "https://remotive.com/api/remote-jobs"


def fetch() -> list[dict]:
    with get_client() as client:
        resp = client.get(URL)
        resp.raise_for_status()
        jobs = resp.json().get("jobs", [])

    out = []
    for job in jobs:
        description = job.get("description")
        salary = job.get("salary")
        if description and salary:
            description = f"{description} Salary: {salary}"
        elif salary:
            description = f"Salary: {salary}"

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
                "title": (job.get("title") or "").strip(),
                "company": (job.get("company_name") or "").strip(),
                "location": (job.get("candidate_required_location") or "").strip()
                or None,
                "remote_type": "remote",
                "apply_url": job.get("url"),
                "source": "remotive",
                "description": description,
                "posted_at": posted_at,
            }
        )
    return keep_valid(out)
