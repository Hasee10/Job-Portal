"""Dice - https://www.dice.com/jobs

Large, long-established tech job board (~95k+ live listings when checked).
Caveat, confirmed by hand: "Apply Now" requires creating a free Dice account
and signing in before the application even starts (redirects to
dice.com/dashboard/login) - unlike Indeed/Glassdoor/hiring.cafe, there is no
way to reach the employer directly without going through Dice's own signup.
The underlying job postings themselves are real and detailed (title,
company, salary, full description) - this is a friction/gating concern, not
a data-quality one, and is disclosed in the README rather than hidden.
"""

import logging
import re

logger = logging.getLogger(__name__)

SEARCH_URLS = [
    "https://www.dice.com/jobs?q=software+engineer",
    "https://www.dice.com/jobs?q=data+analyst",
    "https://www.dice.com/jobs?q=project+manager",
]

CARD_SELECTOR = 'div[data-testid="job-card"]'
TITLE_SELECTOR = 'a[data-testid="job-search-job-detail-link"]'
COMPANY_SELECTOR = 'a[href*="company-profile"]'

_EMPLOYMENT_TYPE_RE = re.compile(
    r"\b(full-time|part-time|contract|contract to hire|third party)\b", re.IGNORECASE
)
_SALARY_RE = re.compile(r"(usd|\$)\s?[\d,.]+.*?(per\s+(year|hour|month))", re.IGNORECASE)


def _extract_card(card) -> dict | None:
    data = card.evaluate(
        """
        (card) => {
          const titleLink = card.querySelector('a[data-testid="job-search-job-detail-link"]');
          // Two <a href*="company-profile"> exist per card (one wraps just
          // the logo image with no text) - take the one with visible text.
          const companyLinks = [...card.querySelectorAll('a[href*="company-profile"]')];
          const companyLink = companyLinks.find(a => a.textContent.trim().length > 0);
          const paragraphs = [...card.querySelectorAll('p')].map(p => p.textContent.trim());
          return {
            title: titleLink ? titleLink.textContent.trim() : null,
            href: titleLink ? titleLink.href : null,
            company: companyLink ? companyLink.textContent.trim() : null,
            paragraphs,
          };
        }
        """
    )
    if not data.get("title") or not data.get("href"):
        return None
    return data


def fetch(browser) -> list[dict]:
    out = []
    page = browser.new_page()
    try:
        for url in SEARCH_URLS:
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=25000)
                page.wait_for_timeout(2000)
            except Exception:
                logger.warning("dice: failed to load %s", url)
                continue

            cards = page.query_selector_all(CARD_SELECTOR)
            for card in cards:
                data = _extract_card(card)
                if not data:
                    continue

                paragraphs = data.get("paragraphs") or []
                # paragraphs[0] is company (already have it via the link),
                # paragraphs[1] is location, remaining entries are a mix of
                # date/description/tags whose order and count vary (e.g. a
                # "Sponsored" tag isn't always present) - pull salary/
                # employment type out by content match instead of position.
                location = paragraphs[1] if len(paragraphs) > 1 else None
                description = paragraphs[4] if len(paragraphs) > 4 else None

                employment_type_hint = None
                salary_text = None
                for text in paragraphs:
                    if not employment_type_hint and _EMPLOYMENT_TYPE_RE.search(text):
                        employment_type_hint = _EMPLOYMENT_TYPE_RE.search(text).group(1)
                    if not salary_text and _SALARY_RE.search(text):
                        salary_text = text

                out.append(
                    {
                        "title": data["title"],
                        "company": data.get("company") or "",
                        "location": location,
                        "remote_type": "remote"
                        if location and "remote" in location.lower()
                        else "unknown",
                        "apply_url": data["href"],
                        "source": "dice",
                        "description": (
                            f"{description}\n\nSalary: {salary_text}"
                            if description and salary_text
                            else description
                        ),
                        "posted_at": None,
                        "employment_type_hint": employment_type_hint,
                    }
                )
    finally:
        page.close()
    return out
