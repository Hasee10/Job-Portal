from jobscraper.sources import (
    adzuna,
    arbeitnow,
    ats_boards,
    brightspyre,
    himalayas,
    jobicy,
    jooble,
    merojob,
    mustakbil,
    remoteok,
    remotive,
    themuse,
    weworkremotely,
)

# hackernews is intentionally NOT wired into API_SOURCES yet - live testing
# (2026-07) showed only ~9% of "Who is hiring" comments (19/215) parse into
# a real structured company/title; the rest fall back to a generic
# placeholder ("See description for company"). That's below the quality bar
# for a job board where title/company are the primary things shown on a
# card, even though the parser itself no longer produces broken/oversized
# fields. Revisit if a better extraction approach (e.g. LLM-based field
# extraction from the freeform text) is built later - the module and its
# fetch() function are ready to register the moment that's true.

# API-based sources - no browser needed, all plain HTTP/RSS.
#
# brightspyre (Pakistan), mustakbil (Pakistan), and merojob (Nepal) added
# 2026-07 as part of the South Asia expansion - all three are plain
# server-rendered HTML or a genuine public REST API, no CloakBrowser needed
# (see each module's docstring). Rozee.pk (Pakistan) and Upwork are
# CloakBrowser-based instead (Cloudflare-gated) - see sources/browser/.
API_SOURCES = [
    remotive,
    arbeitnow,
    themuse,
    adzuna,
    jooble,
    remoteok,
    weworkremotely,
    himalayas,
    jobicy,
    ats_boards,
    brightspyre,
    mustakbil,
    merojob,
]

__all__ = ["API_SOURCES"]
