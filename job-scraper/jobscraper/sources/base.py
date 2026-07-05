import logging

import httpx

from jobscraper import config

logger = logging.getLogger(__name__)

# Per-run record of what every source actually did - reset at the start of
# pipeline.run() and read back at the end to build a human-scannable
# summary. Without this, telling "did it work" apart from "did it silently
# find 0 jobs" required manually reading thousands of raw log lines (see the
# 2026-07 Upwork/Rozee incident where this took ~20 minutes of back-and-forth
# to diagnose).
_run_results: list[dict] = []


def reset_run_results() -> None:
    _run_results.clear()


def get_run_results() -> list[dict]:
    return list(_run_results)


def record_skipped(source_name: str, reason: str) -> None:
    """Records a source that was deliberately excluded this run (e.g. via
    SKIP_SOURCES) - distinct from a 0-count or errored fetch, so the summary
    doesn't flag an intentional skip as if something broke.
    """
    _run_results.append({"source": source_name, "count": None, "error": None, "skipped": reason})


def get_client() -> httpx.Client:
    return httpx.Client(
        timeout=config.HTTP_TIMEOUT,
        headers={"User-Agent": config.HTTP_USER_AGENT},
        follow_redirects=True,
    )


def keep_valid(jobs: list[dict]) -> list[dict]:
    """Same guard every n8n normalizer used: drop rows missing title/apply_url."""
    return [j for j in jobs if j.get("title") and j.get("apply_url")]


def safe_fetch(source_name: str, fn) -> list[dict]:
    """Run one source's fetch() and never let it take the whole run down."""
    try:
        jobs = fn()
        logger.info("%s: fetched %d jobs", source_name, len(jobs))
        _run_results.append({"source": source_name, "count": len(jobs), "error": None})
        return jobs
    except Exception as exc:
        logger.exception("%s: fetch failed, skipping this source for this run", source_name)
        _run_results.append(
            {"source": source_name, "count": 0, "error": f"{type(exc).__name__}: {exc}"}
        )
        return []
