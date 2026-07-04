"""Stale-job sweeper - Python port of the n8n "07-stale-job-sweeper" workflow,
with two deliberate fixes over the original design (see below).

Checks every active job's apply_url and marks it discontinued (is_active =
false) once the posting is confirmed gone, so acquired/expired/removed
postings disappear from the portal instead of piling up.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import httpx

from jobscraper import config, db

logger = logging.getLogger(__name__)

# 404/410 unambiguously mean "this resource is gone" - safe to act on
# immediately. The n8n version also included 400/403/451, but a live test
# run against this exact dataset showed Remotive, Jobicy, Himalayas, and
# Adzuna's redirect links routinely answering a plain scripted GET with 403
# even for postings that are still live on the site (anti-bot blocking, not
# "job removed"). Auto-deactivating on that basis would have wrongly hidden
# a large fraction of genuinely active jobs.
CONFIRMED_DEAD_CODES = {404, 410}

# 400/403/451 are ambiguous (could be bot-blocking OR a real removal). A job
# only gets deactivated for one of these once it's been seen with the same
# ambiguous status on two separate sweep runs - a transient block rarely
# survives a second run 12+ hours later, a real removal does.
AMBIGUOUS_DEAD_CODES = {400, 403, 451}

STATE_FILE = Path(__file__).parent.parent / "sweeper_state.json"

# Fix #2: the original design checked 5 URLs, then slept 1s, sequentially -
# fine at a few hundred jobs, but at 5,000+ it made a full sweep take over
# 45 minutes (confirmed: it got killed by GitHub Actions' job timeout).
# These URLs are spread across hundreds of distinct external domains (each
# employer/job board is a different host), so real concurrency doesn't
# hammer any single target the way blasting one API would - bounded by a
# semaphore instead of an artificial global delay.
CONCURRENCY = 30
REQUEST_TIMEOUT = 15.0


def _load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state), encoding="utf-8")


async def _check_url(
    client: httpx.AsyncClient, semaphore: asyncio.Semaphore, url: str
) -> int | None:
    async with semaphore:
        try:
            resp = await client.get(url, follow_redirects=True, timeout=REQUEST_TIMEOUT)
            return resp.status_code
        except httpx.HTTPError:
            return None


async def _check_all(jobs: list[dict]) -> list[int | None]:
    headers = {"User-Agent": config.HTTP_USER_AGENT}
    semaphore = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient(headers=headers) as client:
        return await asyncio.gather(
            *(_check_url(client, semaphore, job["apply_url"]) for job in jobs)
        )


async def _mark_discontinued_async(job_ids: list[str]) -> int:
    if not job_ids:
        return 0

    config.require_supabase()
    now = datetime.now(timezone.utc).isoformat()
    headers = {
        "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    semaphore = asyncio.Semaphore(CONCURRENCY)

    async def patch_one(client: httpx.AsyncClient, job_id: str) -> bool:
        async with semaphore:
            url = f"{config.SUPABASE_URL}/rest/v1/jobs?id=eq.{job_id}"
            try:
                resp = await client.patch(
                    url,
                    headers=headers,
                    json={"is_active": False, "discontinued_at": now},
                    timeout=REQUEST_TIMEOUT,
                )
                return resp.status_code < 300
            except httpx.HTTPError:
                return False

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*(patch_one(client, jid) for jid in job_ids))
    return sum(results)


def sweep() -> int:
    jobs = db.fetch_active_jobs()
    logger.info(
        "sweeper: checking %d active job URLs (%d concurrent)",
        len(jobs),
        CONCURRENCY,
    )

    state = _load_state()
    seen_ambiguous_ids: set[str] = set()
    dead_ids: list[str] = []

    statuses = asyncio.run(_check_all(jobs))

    for job, status in zip(jobs, statuses):
        job_id = job["id"]
        if status in CONFIRMED_DEAD_CODES:
            dead_ids.append(job_id)
        elif status in AMBIGUOUS_DEAD_CODES:
            seen_ambiguous_ids.add(job_id)
            if job_id in state:
                dead_ids.append(job_id)
            else:
                state[job_id] = status
        # else: alive, timeout, or other error - leave state alone; only a
        # clean 2xx (or a status outside both sets) should clear an entry.

    # Drop state entries for jobs that recovered (no longer ambiguous) or
    # that just got confirmed dead this run.
    state = {
        job_id: status
        for job_id, status in state.items()
        if job_id in seen_ambiguous_ids and job_id not in dead_ids
    }
    _save_state(state)

    marked = asyncio.run(_mark_discontinued_async(dead_ids))
    logger.info(
        "sweeper: marked %d jobs discontinued (%d newly flagged as ambiguous, "
        "awaiting confirmation next run)",
        marked,
        len(state),
    )
    return marked
