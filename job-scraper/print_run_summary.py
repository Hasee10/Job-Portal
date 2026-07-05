#!/usr/bin/env python
"""Reads run_summary.json (written by pipeline.py at the end of a run) and
appends a human-scannable markdown block to $GITHUB_STEP_SUMMARY, so a run's
outcome - including any source that silently returned 0 jobs or errored -
shows up directly on the GitHub Actions run page. Safe to run even if the
scraper crashed before writing the summary file.
"""

import json
import os
import sys
from pathlib import Path

SUMMARY_FILE = Path(__file__).parent / "run_summary.json"


def main() -> int:
    step_summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not step_summary_path:
        print("GITHUB_STEP_SUMMARY not set - not running in GitHub Actions, nothing to do")
        return 0

    lines = ["## Scraper run summary", ""]

    if not SUMMARY_FILE.exists():
        lines.append(
            "**The run did not finish writing a summary - it likely crashed or was "
            "killed before completing.** Check the \"Run scraper\" step's raw log."
        )
        with open(step_summary_path, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        return 0

    data = json.loads(SUMMARY_FILE.read_text(encoding="utf-8"))

    lines.append(f"- **Upserted:** {data.get('upserted')}")
    lines.append(f"- **Sweeper marked discontinued:** {data.get('sweeper_marked')}")
    for source, count in (data.get("deactivated_by_source") or {}).items():
        lines.append(f"- **{source} deactivated (presence check):** {count}")
    lines.append("")

    attention = data.get("sources_needing_attention") or []
    if attention:
        lines.append("### Needs attention")
        lines.append("")
        lines.append("| Source | Count | Error |")
        lines.append("|---|---|---|")
        for r in attention:
            lines.append(f"| {r['source']} | {r.get('count')} | {r.get('error') or ''} |")
        lines.append("")

    lines.append("<details><summary>All sources</summary>")
    lines.append("")
    lines.append("| Source | Result |")
    lines.append("|---|---|")
    for r in data.get("sources", []):
        if r.get("skipped"):
            result = f"skipped ({r['skipped']})"
        elif r.get("error"):
            result = f"ERROR: {r['error']}"
        else:
            result = f"{r['count']} jobs"
        lines.append(f"| {r['source']} | {result} |")
    lines.append("")
    lines.append("</details>")

    with open(step_summary_path, "a", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
