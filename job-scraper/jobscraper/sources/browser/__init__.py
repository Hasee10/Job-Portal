from jobscraper.sources.browser import (
    bayt,
    dice,
    glassdoor,
    gulftalent,
    hiringcafe,
    indeed,
    levels_fyi,
    naukri,
    naukrigulf,
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
#
# gulftalent and naukrigulf (Middle East, added 2026-07) both call a JSON
# endpoint via page.evaluate(fetch(...)) instead of parsing HTML - see each
# module's docstring for why a plain httpx module (like Adzuna/Jooble) gets
# blocked by bot detection that a real browser context sails through.
#
# bayt (Middle East, added 2026-07) is plain server-rendered HTML, parsed
# with CSS selectors like naukri.py - runs a country x keyword matrix since,
# unlike gulftalent/naukrigulf, one query doesn't span every country.
BROWSER_SOURCES = [
    indeed,
    glassdoor,
    naukri,
    gulftalent,
    naukrigulf,
    bayt,
    hiringcafe,
    ziprecruiter,
    dice,
    levels_fyi,
    upwork,
    rozee,
]

__all__ = ["BROWSER_SOURCES"]
