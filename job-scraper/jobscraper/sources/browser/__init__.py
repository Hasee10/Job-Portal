from jobscraper.sources.browser import (
    dice,
    glassdoor,
    hiringcafe,
    indeed,
    levels_fyi,
    naukri,
    rozee,
    upwork,
    ziprecruiter,
)

# Browser-rendered sources - fetched through one shared CloakBrowser session.
# These sites actively block plain HTTP scraping (or require JS rendering),
# which is the actual use case CloakBrowser exists for.
#
# jobright.py was dropped from this list (2026-07) - it turned out to be a
# real "Sign In / Join Now" gated product with no public listings to scrape,
# not a bot-blocking issue CloakBrowser could work around. Left in the repo
# for reference/history but not imported here.
#
# LEGAL NOTE: Indeed, Glassdoor, ZipRecruiter, Naukri, Upwork, and Rozee.pk
# all prohibit automated scraping in their Terms of Service. hiring.cafe does
# not currently prohibit it and serves server-rendered HTML. Dice and
# Levels.fyi's ToS were not successfully checked (fetch attempts were
# blocked/inconclusive) - treat their status as unverified rather than
# assuming either way. Scraping the confirmed-restricted sites carries real
# risk (IP bans, cease-and-desist, account bans if ever logged in) - this
# was a deliberate choice made by the site owner, not a default. See
# job-scraper/README.md "Sources & links" for details on each one.
#
# Upwork and Rozee.pk both need pipeline.py's PRESENCE_RECONCILED_SOURCES
# path instead of the plain-HTTP sweeper for cleaning up closed/awarded
# postings - see each module's docstring for why.
BROWSER_SOURCES = [
    indeed,
    glassdoor,
    naukri,
    hiringcafe,
    ziprecruiter,
    dice,
    levels_fyi,
    upwork,
    rozee,
]

__all__ = ["BROWSER_SOURCES"]
