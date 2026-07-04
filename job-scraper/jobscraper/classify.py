"""Fills in `type` (employment type) and `career_level` for every scraped
job.

None of the 18 sources in this project were ever mapped to these two
columns, so every row silently fell back to the database defaults -
`type='Full-time'` and `career_level=['NotSpecified']` - regardless of what
the actual posting said. On the live portal this looked like broken
filters (checking "Entry Level" or "Contract" always returned ~0 results,
since virtually nothing in the table was ever anything else), but the
filters themselves were working correctly against the data they were
given - the data was just never being classified in the first place.

Two signals, in priority order:
1. `employment_type_hint` - a small number of sources expose a real
   structured field (Adzuna's contract_time/contract_type, Lever's
   categories.commitment) - a couple of source modules set this key before
   calling classify_employment_type, and it's trusted over guessing from
   text.
2. Keyword matching against the job title - reliable for the common case
   (titles routinely say "(Contract)", "Senior", "Intern", etc explicitly)
   and works uniformly across every source, including the ones with no
   structured field at all.
"""

import re

_EMPLOYMENT_TYPE_HINT_MAP = {
    # Adzuna contract_time / contract_type values
    "part_time": "Part-time",
    "full_time": "Full-time",
    "contract": "Contract",
    "permanent": "Full-time",
    # Lever categories.commitment / generic English values
    "part-time": "Part-time",
    "full-time": "Full-time",
    "freelance": "Freelance",
    "temporary": "Contract",
}

# Checked in order; first match wins. Multi-word/specific phrases are listed
# before short generic words that could appear inside them.
_EMPLOYMENT_TYPE_TITLE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bfreelance(r)?\b", re.IGNORECASE), "Freelance"),
    (re.compile(r"\bpart[\s-]?time\b", re.IGNORECASE), "Part-time"),
    (
        re.compile(r"\bcontract(or|[\s-]to[\s-]hire)?\b|\btemp(orary)?\b", re.IGNORECASE),
        "Contract",
    ),
]


def classify_employment_type(job: dict) -> str:
    hint = (job.get("employment_type_hint") or "").strip().lower()
    if hint in _EMPLOYMENT_TYPE_HINT_MAP:
        return _EMPLOYMENT_TYPE_HINT_MAP[hint]

    title = job.get("title") or ""
    for pattern, label in _EMPLOYMENT_TYPE_TITLE_PATTERNS:
        if pattern.search(title):
            return label

    return "Full-time"


# Checked in order; a title can match more than one (e.g. "Senior Manager"
# reasonably tags both Senior and SeniorManager) - CareerLevel is an array
# on the Job type, so multiple tags make a job discoverable under more than
# one filter rather than forcing a single (often wrong) bucket.
_CAREER_LEVEL_TITLE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bintern(ship)?\b", re.IGNORECASE), "Internship"),
    (re.compile(r"\bnew\s?grad(uate)?\b|\bentry[\s-]?level\b", re.IGNORECASE), "EntryLevel"),
    (re.compile(r"\bjunior\b|\bjr\.?\b", re.IGNORECASE), "Junior"),
    (re.compile(r"\bassociate\b", re.IGNORECASE), "Associate"),
    (re.compile(r"\bmid[\s-]?level\b|\bmid[\s-]?senior\b", re.IGNORECASE), "MidLevel"),
    (re.compile(r"\bstaff\b", re.IGNORECASE), "Staff"),
    (re.compile(r"\bprincipal\b", re.IGNORECASE), "Principal"),
    (re.compile(r"\blead\b", re.IGNORECASE), "Lead"),
    (re.compile(r"\bsenior\s+director\b", re.IGNORECASE), "SeniorDirector"),
    (re.compile(r"\bdirector\b", re.IGNORECASE), "Director"),
    (re.compile(r"\bsenior\s+manager\b", re.IGNORECASE), "SeniorManager"),
    (re.compile(r"\bmanager\b", re.IGNORECASE), "Manager"),
    (
        re.compile(r"\bsvp\b|\bsenior\s+vice\s+president\b", re.IGNORECASE),
        "SVP",
    ),
    (
        re.compile(r"\bevp\b|\bexecutive\s+vice\s+president\b", re.IGNORECASE),
        "EVP",
    ),
    (re.compile(r"\bvp\b|\bvice\s+president\b", re.IGNORECASE), "VP"),
    (
        re.compile(r"\bfounder\b|\bco-founder\b", re.IGNORECASE),
        "Founder",
    ),
    (
        re.compile(r"\bchief\s+\w+\s+officer\b|\bce[o0]\b|\bcto\b|\bcfo\b|\bcoo\b", re.IGNORECASE),
        "CLevel",
    ),
    (re.compile(r"\bsenior\b|\bsr\.?\b", re.IGNORECASE), "Senior"),
]


def classify_career_level(job: dict) -> list[str]:
    title = job.get("title") or ""
    matches = []
    for pattern, label in _CAREER_LEVEL_TITLE_PATTERNS:
        if pattern.search(title) and label not in matches:
            matches.append(label)
    return matches or ["NotSpecified"]
