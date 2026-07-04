"""Converts scraped job descriptions to clean Markdown before they ever
reach Supabase.

Every source in this project returns raw HTML for `description` (Remotive,
Adzuna, Jooble, Greenhouse `content`, etc - Ashby's `descriptionPlain` is
already plain text but most aren't). Two independent reasons to clean it up
here rather than downstream:

1. Defense in depth. The bordful-main frontend renders description through
   react-markdown *without* the rehype-raw plugin, which today means raw
   HTML tags are shown as escaped literal text rather than executed - not
   exploitable as-is. But that's one frontend config change away from
   becoming a stored-XSS hole for any of the 15+ external sources feeding
   this table, and the RSS/JSON feed output has no such protection at all.
   Storing plain Markdown removes the entire attack surface regardless of
   how the frontend renders it later.
2. Data quality. The frontend renders description through ReactMarkdown, so
   it needs real Markdown - not HTML (shows up as literal "<div class=...>"
   text) and not flattened plain text either (an earlier version of this
   function joined every line with a single "\n" and dropped blank lines,
   which destroys the blank-line paragraph breaks Markdown requires,
   producing a single unreadable wall of text). markdownify converts
   headings/lists/bold/paragraphs to real Markdown syntax instead.
"""

import re

from bs4 import BeautifulSoup
from markdownify import markdownify

_STRIP_TAGS = ("script", "style", "iframe", "object", "embed", "noscript")
_EXCESS_BLANK_LINES_RE = re.compile(r"\n{3,}")
_TRAILING_SPACES_RE = re.compile(r"[ \t]+\n")


def clean_description(value: str | None) -> str | None:
    if not value:
        return value

    soup = BeautifulSoup(value, "lxml")
    for tag in soup.find_all(_STRIP_TAGS):
        tag.decompose()

    md = markdownify(str(soup), heading_style="ATX", bullets="-")
    md = _TRAILING_SPACES_RE.sub("\n", md)
    md = _EXCESS_BLANK_LINES_RE.sub("\n\n", md)
    md = md.strip()
    return md or None
