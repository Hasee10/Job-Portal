#!/usr/bin/env python
"""Entry point for the job scraper. Run manually, or via the Windows
Scheduled Task installed by install_task.ps1 (runs this every 12 hours).

Usage:
    python run.py                  # full run: all sources + sweeper
    python run.py --no-browser     # skip CloakBrowser-based sources
    python run.py --no-sweep       # skip the stale-job sweep
    python run.py --sweep-only     # only run the sweeper, skip collection
"""

import argparse
import sys

from jobscraper import pipeline
from jobscraper.logging_conf import setup_logging


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-browser", action="store_true", help="skip CloakBrowser sources")
    parser.add_argument("--no-sweep", action="store_true", help="skip the stale-job sweep")
    parser.add_argument("--sweep-only", action="store_true", help="only run the sweeper")
    args = parser.parse_args()

    setup_logging()

    if args.sweep_only:
        from jobscraper import sweeper

        sweeper.sweep()
        return 0

    pipeline.run(
        include_browser_sources=not args.no_browser,
        run_sweeper=not args.no_sweep,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
