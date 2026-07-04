"""Stale-job sweeper - Python port of the n8n "07-stale-job-sweeper" workflow,
with two deliberate fixes over the original design (see below).

Checks every active job's apply_url and marks it discontinued (is_active =
false) once the posting is confirmed gone, so acquired/expired/removed
postings disappear from the portal instead of piling up.
"""

import asyncio
import json
import logging
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

# 400/403/406/451 are ambiguous (could be bot-blocking OR a real removal).
# 406 confirmed via a real case: a job-boards.greenhouse.io posting that had
# already been closed on Reddit's end (its content never refreshed across
# several scrape runs, unlike every other Reddit posting) returned a bare
# "406 Not Acceptable" from nginx when visited directly - almost certainly
# Greenhouse's signal for "this posting no longer exists" rather than a bot
# block (their board API doesn't otherwise show anti-bot behavior), but
# treated as ambiguous rather than confirmed-dead out of the same caution
# that applies to 400/403/451 below. A job only gets deactivated for one of
# these once it's been seen with the same ambiguous status on two separate
# sweep runs - a transient block rarely survives a second run 12+ hours
# later, a real removal does.
AMBIGUOUS_DEAD_CODES = {400, 403, 406, 451}

# Fix #3: the two-strike confirmation above assumes a block is *transient*
# (won't survive a second run). That assumption breaks when a whole site
# blocks every plain scripted request it gets, every time - a live check
# found Indeed, Glassdoor, and Remotive at 100% wrongly deactivated and
# Adzuna/Jooble/Himalayas/Jobicy between 76-88%, because their apply pages
# consistently 403/406 a non-browser GET regardless of whether the job is
# actually still open. Two consecutive sweeps both see the same block and
# wrongly "confirm" it. If a large share of one source's jobs get the same
# ambiguous code in a single run, that's a source-wide block, not evidence
# about any individual job - skip ambiguous handling for that source this
# run entirely rather than let it feed the confirmation counter.
SOURCE_BLOCK_THRESHOLD = 0.4

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


def _source_of(job: dict) -> str:
    # "greenhouse:reddit" -> "greenhouse" - group by platform, not per-company
    # board, since the block behavior is a property of the platform.
    return (job.get("source") or "unknown").split(":")[0]


def _find_blocked_sources(jobs: list[dict], statuses: list[int | None]) -> set[str]:
    per_source_total: dict[str, int] = {}
    per_source_code_count: dict[tuple[str, int], int] = {}

    for job, status in zip(jobs, statuses):
        source = _source_of(job)
        per_source_total[source] = per_source_total.get(source, 0) + 1
        if status in AMBIGUOUS_DEAD_CODES:
            key = (source, status)
            per_source_code_count[key] = per_source_code_count.get(key, 0) + 1

    blocked = set()
    for (source, _status), count in per_source_code_count.items():
        if count / per_source_total[source] >= SOURCE_BLOCK_THRESHOLD:
            blocked.add(source)
    return blocked


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

    blocked_sources = _find_blocked_sources(jobs, statuses)
    if blocked_sources:
        logger.info(
            "sweeper: treating these sources as currently blocking scripted "
            "requests site-wide, skipping ambiguous-status handling for them "
            "this run: %s",
            sorted(blocked_sources),
        )

    for job, status in zip(jobs, statuses):
        job_id = job["id"]
        source = _source_of(job)

        if status in CONFIRMED_DEAD_CODES:
            dead_ids.append(job_id)
        elif status in AMBIGUOUS_DEAD_CODES:
            if source in blocked_sources:
                continue
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

    # A single batched SQL UPDATE (db.mark_discontinued) - no longer needs
    # its own async/concurrency handling now that this isn't one PostgREST
    # PATCH request per job.
    marked = db.mark_discontinued(dead_ids)
    logger.info(
        "sweeper: marked %d jobs discontinued (%d newly flagged as ambiguous, "
        "awaiting confirmation next run)",
        marked,
        len(state),
    )
    return marked
