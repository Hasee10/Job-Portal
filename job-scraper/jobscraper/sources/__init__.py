from jobscraper.sources import (
    adzuna,
    arbeitnow,
    ats_boards,
    himalayas,
    jobicy,
    jooble,
    remoteok,
    remotive,
    themuse,
    weworkremotely,
)

# API-based sources - no browser needed, all plain HTTP/RSS.
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
]

__all__ = ["API_SOURCES"]
