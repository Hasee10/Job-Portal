from jobscraper.sources.browser import (
    glassdoor,
    hiringcafe,
    indeed,
    jobright,
    naukri,
    ziprecruiter,
)

# Browser-rendered sources - fetched through one shared CloakBrowser session.
# These sites actively block plain HTTP scraping (or require JS rendering),
# which is the actual use case CloakBrowser exists for.
#
# LEGAL NOTE: Indeed, Glassdoor, ZipRecruiter, and Naukri all prohibit
# automated scraping in their Terms of Service. hiring.cafe does not
# currently prohibit it and serves server-rendered HTML. Scraping the
# ToS-restricted sites carries real risk (IP bans, cease-and-desist, account
# bans if ever logged in) - this was a deliberate choice made by the site
# owner, not a default. See job-scraper/README.md "Sources & links" for
# details on each one.
BROWSER_SOURCES = [
    indeed,
    glassdoor,
    naukri,
    hiringcafe,
    jobright,
    ziprecruiter,
]

__all__ = ["BROWSER_SOURCES"]
