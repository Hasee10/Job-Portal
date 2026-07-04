"""Rule-based filtering/flagging/scoring - a direct Python port of the logic
that used to live in the n8n "Entry-Level Filter" / "Quality Check" /
"Score Jobs" code nodes, so existing data semantics don't change.
"""

import re
from datetime import datetime, timezone

INCLUDE_KEYWORDS = [
    "intern",
    "graduate",
    "junior",
    "entry level",
    "associate",
    "0-1 years",
    "0-2 years",
    "no experience",
    "trainee",
]
EXCLUDE_KEYWORDS = [
    "5+ years",
    "senior only",
    "unpaid",
    "commission-only",
    "commission only",
]

SUSPICIOUS_KEYWORDS = [
    "pay to apply",
    "training fee",
    "registration fee",
    "whatsapp only",
    "whatsapp-only",
    "crypto",
    "trading platform",
    "forex",
    "investment opportunity",
]

_SALARY_RE = re.compile(
    r"\$|salary|per annum|per year|per month|\bpkr\b|\busd\b|k/year", re.IGNORECASE
)
_UNREALISTIC_DAY_HOUR_RE = re.compile(r"\$\s?\d{4,}\s*/\s*(day|hour)", re.IGNORECASE)
_UNREALISTIC_WEEK_RE = re.compile(
    r"earn\s+\$?\d{3,}[,\d]*\s+per\s+week", re.IGNORECASE
)


def _job_text(job: dict) -> str:
    return f"{job.get('title') or ''} {job.get('description') or ''}".lower()


def apply_entry_level_filter(jobs: list[dict]) -> list[dict]:
    """Sets `entry_level`, and drops jobs matching an exclude keyword."""
    out = []
    for job in jobs:
        text = _job_text(job)
        if any(k in text for k in EXCLUDE_KEYWORDS):
            continue
        job["entry_level"] = any(k in text for k in INCLUDE_KEYWORDS)
        out.append(job)
    return out


def apply_quality_check(jobs: list[dict]) -> list[dict]:
    """Sets `flagged_suspicious`. Suspicious jobs are kept, just marked."""
    for job in jobs:
        text = _job_text(job)
        no_company = not (job.get("company") or "").strip()
        keyword_hit = any(k in text for k in SUSPICIOUS_KEYWORDS)
        unrealistic_salary = bool(
            _UNREALISTIC_DAY_HOUR_RE.search(text) or _UNREALISTIC_WEEK_RE.search(text)
        )
        job["flagged_suspicious"] = keyword_hit or no_company or unrealistic_salary
    return jobs


def score_jobs(jobs: list[dict]) -> list[dict]:
    """Plain arithmetic 0-100 score, clamped. No AI/ML involved."""
    now = datetime.now(timezone.utc)
    for job in jobs:
        text = f"{job.get('title') or ''} {job.get('description') or ''}"
        score = 0

        if _SALARY_RE.search(text):
            score += 20

        posted_at = job.get("posted_at")
        days_old = 999
        if posted_at:
            try:
                parsed = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                days_old = (now - parsed).total_seconds() / 86400
            except (ValueError, AttributeError):
                days_old = 999
        if days_old <= 7:
            score += 20

        if job.get("remote_type") in ("remote", "hybrid"):
            score += 15
        if job.get("entry_level"):
            score += 15
        if job.get("apply_url"):
            score += 10

        if job.get("flagged_suspicious"):
            score -= 50
        if not _SALARY_RE.search(text) and not job.get("description"):
            score -= 10

        job["score"] = max(0, min(100, score))
    return jobs


def process(jobs: list[dict]) -> list[dict]:
    """Full pipeline stage: filter -> flag -> score."""
    jobs = apply_entry_level_filter(jobs)
    jobs = apply_quality_check(jobs)
    jobs = score_jobs(jobs)
    return jobs
