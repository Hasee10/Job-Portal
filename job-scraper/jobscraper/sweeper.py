"""Stale-job sweeper - Python port of the n8n "07-stale-job-sweeper" workflow,
with one deliberate correctness fix (see CONFIRMED_DEAD_CODES below).

Checks every active job's apply_url and marks it discontinued (is_active =
false) once the posting is confirmed gone, so acquired/expired/removed
postings disappear from the portal instead of piling up.
"""

import json
import logging
import time
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
BATCH_SIZE = 5
BATCH_DELAY_SECONDS = 1.0


def _load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state), encoding="utf-8")


def _check_url(client: httpx.Client, url: str) -> int | None:
    try:
        resp = client.get(url, follow_redirects=True, timeout=15.0)
        return resp.status_code
    except httpx.HTTPError:
        return None


def sweep() -> int:
    jobs = db.fetch_active_jobs()
    logger.info("sweeper: checking %d active job URLs", len(jobs))

    state = _load_state()
    seen_ambiguous_ids: set[str] = set()
    dead_ids: list[str] = []

    headers = {"User-Agent": config.HTTP_USER_AGENT}
    with httpx.Client(headers=headers) as client:
        for i in range(0, len(jobs), BATCH_SIZE):
            batch = jobs[i : i + BATCH_SIZE]
            for job in batch:
                job_id = job["id"]
                status = _check_url(client, job["apply_url"])

                if status in CONFIRMED_DEAD_CODES:
                    dead_ids.append(job_id)
                elif status in AMBIGUOUS_DEAD_CODES:
                    seen_ambiguous_ids.add(job_id)
                    if job_id in state:
                        dead_ids.append(job_id)
                    else:
                        state[job_id] = status
                # else: alive, timeout, or other error - leave state alone
                # only on a clean 2xx; ambiguous statuses persist below.

            if i + BATCH_SIZE < len(jobs):
                time.sleep(BATCH_DELAY_SECONDS)

    # Drop state entries for jobs that recovered (no longer ambiguous) or
    # that just got confirmed dead this run.
    state = {
        job_id: status
        for job_id, status in state.items()
        if job_id in seen_ambiguous_ids and job_id not in dead_ids
    }
    _save_state(state)

    marked = db.mark_discontinued(dead_ids)
    logger.info(
        "sweeper: marked %d jobs discontinued (%d newly flagged as ambiguous, "
        "awaiting confirmation next run)",
        marked,
        len(state),
    )
    return marked
