"""Hacker News "Who is hiring?" monthly thread.

Freeform text posts, not a structured API - lower confidence than the ATS
board sources in this project. Uses the Algolia HN Search API to find the
latest thread (public, no auth, explicitly meant for this kind of
consumption) and Algolia's own /items endpoint, which conveniently returns
the whole thread - story plus every top-level comment - in one request, no
need to walk the separate Firebase API comment-by-comment.

Parsing: the community convention (not enforced, so this is heuristic) is a
pipe-separated first line, e.g. "Company | Location | Role | REMOTE" - but
posters don't follow a fixed field order (verified live: one real post led
with location instead of company). If the convention isn't recognizable,
this falls back to a generic title and the full comment text as
description rather than dropping the post entirely.
"""

import logging
import re
from html import unescape

from jobscraper.sources.base import get_client, keep_valid

logger = logging.getLogger(__name__)

SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date"
ITEM_URL = "https://hn.algolia.com/api/v1/items/{id}"

_TAG_RE = re.compile(r"<[^>]+>")
_URL_RE = re.compile(r'https?://[^\s<>"]+')
_TITLE_KEYWORD_RE = re.compile(
    r"\b(engineer|developer|programmer|manager|designer|lead|founder|"
    r"scientist|analyst|architect|director|recruiter|marketer)\b",
    re.IGNORECASE,
)

# A real "Company | Location | Role | ..." header is short - anything longer
# than this is almost certainly prose, not a structured header line.
MAX_HEADER_LENGTH = 200
# Sanity cap on an individual extracted field (company or title) - if a
# parsed segment is longer than this, it isn't really a company/title.
MAX_FIELD_LENGTH = 100


def _strip_html(text: str) -> str:
    # HN comment text is basic HTML (<p>, <i>, <a>) - strip tags, unescape entities.
    return unescape(_TAG_RE.sub(" ", text)).strip()


def _find_latest_thread_id() -> str | None:
    with get_client() as client:
        resp = client.get(
            SEARCH_URL,
            params={"tags": "story,author_whoishiring", "hitsPerPage": 1},
        )
        resp.raise_for_status()
        hits = resp.json().get("hits", [])
        return hits[0]["objectID"] if hits else None


def _parse_comment(comment: dict) -> dict | None:
    raw_text = comment.get("text")
    if not raw_text:
        return None  # deleted/dead comment

    clean_text = _strip_html(raw_text)
    first_line = clean_text.split("\n", 1)[0]
    parts = [p.strip() for p in first_line.split("|") if p.strip()]

    # Only trust the pipe-convention when the first line actually looks like
    # a structured header: short, with at least two separators. Live testing
    # found plenty of posts that are a single giant unstructured paragraph
    # with zero or one stray "|" in it (no newline either, so "first line"
    # was the *entire* comment) - splitting that on "|" produced a "title" or
    # "company" that was the whole multi-hundred-character post, clearly
    # wrong for a job card. Anything that doesn't look like a real header,
    # or whose extracted fields end up implausibly long anyway, falls back
    # to clearly-generic placeholders instead of guessing - the full text is
    # always preserved in `description` regardless.
    looks_structured = len(first_line) <= MAX_HEADER_LENGTH and len(parts) >= 2

    company = parts[0] if looks_structured else None
    title = (
        next(
            (p for p in parts if _TITLE_KEYWORD_RE.search(p)),
            parts[1] if len(parts) > 1 else None,
        )
        if looks_structured
        else None
    )

    if company and len(company) > MAX_FIELD_LENGTH:
        company = None
    if title and len(title) > MAX_FIELD_LENGTH:
        title = None

    company = company or "See description for company"
    title = title or "Hiring - see description for role"

    remote_type = "remote" if "remote" in first_line.lower() else "unknown"

    urls = _URL_RE.findall(clean_text)
    # No application link in the post text at all (common - many just say
    # "email me") - fall back to the HN comment's own permalink, same
    # convention already used for Himalayas/RemoteOK (see README).
    apply_url = urls[0] if urls else f"https://news.ycombinator.com/item?id={comment.get('id')}"

    return {
        "title": title,
        "company": company,
        "location": None,
        "remote_type": remote_type,
        "apply_url": apply_url,
        "source": "hackernews",
        "description": clean_text,
        "posted_at": comment.get("created_at"),
    }


def fetch() -> list[dict]:
    thread_id = _find_latest_thread_id()
    if not thread_id:
        logger.warning("hackernews: couldn't find a 'Who is hiring' thread")
        return []

    with get_client() as client:
        resp = client.get(ITEM_URL.format(id=thread_id))
        resp.raise_for_status()
        thread = resp.json()

    out = []
    for comment in thread.get("children", []):
        parsed = _parse_comment(comment)
        if parsed:
            out.append(parsed)
    return keep_valid(out)
