"""Strips scraped job descriptions down to plain text before they ever reach
Supabase.

Every source in this project returns raw HTML for `description` (Remotive,
Adzuna, Jooble, Greenhouse `content`, Ashby `descriptionPlain` is already
plain but others aren't, etc). Two independent reasons to clean it here
rather than downstream:

1. Defense in depth. The bordful-main frontend renders description through
   react-markdown *without* the rehype-raw plugin, which today means raw
   HTML tags are shown as escaped literal text rather than executed - not
   exploitable as-is. But that's one frontend config change away from
   becoming a stored-XSS hole for any of the 15+ external sources feeding
   this table, and the RSS/JSON feed output has no such protection at all.
   Storing plain text removes the entire attack surface regardless of how
   the frontend renders it later.
2. Data quality. Un-stripped HTML shows up as literal "<div class=...>" text
   in a markdown renderer, which looks broken to a real visitor.
"""

from bs4 import BeautifulSoup

_STRIP_TAGS = ("script", "style", "iframe", "object", "embed", "noscript")


def clean_description(value: str | None) -> str | None:
    if not value:
        return value

    soup = BeautifulSoup(value, "lxml")
    for tag in soup.find_all(_STRIP_TAGS):
        tag.decompose()

    text = soup.get_text(separator="\n")
    # Collapse the blank-line runs BeautifulSoup's block-tag separators leave
    # behind without destroying intentional paragraph breaks.
    lines = [line.strip() for line in text.splitlines()]
    cleaned = "\n".join(line for line in lines if line)
    return cleaned or None
