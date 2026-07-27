# Market Intel — Build Research

Research only, no implementation. Follows on from `overview.md` (product framing) and `HP.md` (homepage/landing design) — this fills in the technical/legal/competitive questions those docs left open.

---

## 1. The single biggest finding: don't build the Daraz scraper in-house — buy it

Daraz (our primary target, ~35% of Pakistan's e-commerce market) is a hard scraping target in 2026, but a cheap, ready-made solution already exists.

**Why in-house scraping is hard:**
- Daraz serves different prices/stock/currency based on the visitor's IP geography — scraping from outside Pakistan gets wrong prices or a block. Needs Pakistan-based (or Pakistan-presenting) IPs specifically, not just "any proxy."
- Daraz runs Cloudflare Turnstile, described as "the hardest challenge in 2026" — JS fingerprinting, behavioral analysis, occasional visual challenges. This isn't a one-time bypass; it needs ongoing maintenance as the anti-bot layer evolves.
- Building this in-house means owning: residential proxy rotation, headless browser fleet (Playwright + stealth patches), CAPTCHA solving, and constant babysitting as Daraz's defenses change.

**What already exists:** Apify has ready-made Daraz product scrapers in its marketplace — **$0.69–$0.95 per 1,000 results**, one clocked at 4,000+ products scraped in under 40 seconds, and explicitly covers Pakistan (also Bangladesh, Nepal, Sri Lanka, Myanmar). This is a hosted actor you call via API — Apify owns the proxy/anti-bot/maintenance burden, not us.

**Recommendation:** Start with Apify (or an equivalent managed scraper marketplace) for Daraz specifically, rather than building a custom scraper against a target that's actively hardening its defenses. Revisit in-house scraping later only if volume/cost genuinely justifies it — this is a classic build-vs-buy call where "buy" is dramatically cheaper for v1. Reserve in-house `scripts/`-style scrapers (matching our existing job-scraper pattern) for smaller/less-defended platforms.

---

## 2. Pakistan e-commerce landscape (who to actually track)

Market is ~$11–12B in 2026, 85%+ of orders from mobile.

| Platform | Position | Scraping difficulty |
|---|---|---|
| **Daraz.pk** | Dominant, ~35% share, general marketplace | Hard (Cloudflare Turnstile, geo-IP) — use a managed scraper (§1) |
| **PriceOye.pk** | Leads electronics category, open-parcel delivery | Unconfirmed, worth a spike before committing |
| **Telemart.pk** | Strong in tech/gadgets, omnichannel (37 physical stores + online) | Unconfirmed |
| **Naheed.pk** | Largest hypermarket chain — groceries, electronics, home goods | Different vertical (grocery/FMCG) than the others |
| Others in the top 10 | OLX, Shophive, HomeShopping, iShopping.pk, Sapphireonline, Goto | Long tail, lower priority for v1 |

**v1 recommendation:** Daraz (via managed scraper) + one electronics-focused site (PriceOye or Telemart) to prove cross-category comparison works, before adding more sources. This matches `overview.md`'s original "start with 1–2 sources" instinct, now with a concrete reason for which two.

---

## 3. Who would actually pay for this

Pakistan has an active FMCG sector (Unilever PK, Nestlé PK, Engro Foods, National Foods, Shan Foods, plus smaller/regional brands) that already competes on shelf pricing and would plausibly want the same visibility online — comparing their own listings and pricing against competitors across Daraz/PriceOye/etc. FMCG-specific pricing intelligence is a recognized product category internationally (e.g. dedicated "FMCG & CPG pricing intelligence" vendors exist), which is a reasonable existence proof that the demand pattern is real, not invented.

This doesn't resolve `overview.md`'s open question #4 ("who is the actual first customer"), but narrows it: **brand/FMCG marketing teams tracking their own + competitors' e-commerce presence** is a more concrete hypothesis than "marketers in general," and worth validating directly (e.g. via the waitlist signups already being collected on `/intel`) before building anything beyond the landing page.

---

## 4. Competitive landscape — what similar products charge and offer

Two established players, useful as a feature/pricing reference point (not to copy, but to calibrate scope):

| | Prisync | Price2Spy |
|---|---|---|
| Core loop | Import your products + competitor URLs → auto-updates prices up to 3x/day, can auto-reprice your own store | Same core loop, plus 25+ scheduled report types (price position, MAP compliance, market position by category) |
| Differentiator | Multi-channel tracking, integrates with Shopify/Magento/WooCommerce | "Stealth IP" — proprietary tech specifically for monitoring bot-protected sites (i.e. they've already solved the exact Daraz-style problem in §1) |
| 2026 pricing | $99/mo (100 products) → $399/mo (5,000 products) | $39.95/mo (500 URLs) → $157.95/mo (2,000 URLs, marketplace monitoring + MAP enforcement) |

**Takeaway for our MVP feature set (already sketched in `overview.md` §2.2):** catalog tracking + price history + watchlists + export/digest is the right minimum — it's the same core loop both incumbents lead with. MAP (minimum advertised price) enforcement and auto-repricing are the more advanced tier both offer; reasonable to leave for a later phase rather than v1.

**Takeaway for pricing (open question in `overview.md`/`HP.md`):** $40–100/month is roughly where the entry tier for "one platform, few hundred products" sits internationally. Not a recommendation to copy directly — Pakistan pricing power is different — but a sane anchor rather than guessing from zero.

---

## 5. Legal considerations (flagged, not resolved — needs a real legal read before scraping starts)

**Pakistan-specific:**
- Pakistan has no dedicated data protection law yet. The **Prevention of Electronic Crimes Act (PECA) 2016**, amended in 2025, is the operative framework. PECA Section 38 criminalizes transferring another person's *personal/sensitive data* without consent (up to 3 years imprisonment or PKR 1M fine); Section 3 covers unauthorized access to information systems/data.
- Critically: **product/price/catalog data is not personal data.** Scraping public product listings (title, price, seller name, stock status) is a materially different legal category from scraping personal profiles — PECA's teeth are aimed at the latter. This is a meaningful distinction in our favor, but not a substitute for real legal review, especially around any seller-identifying or review/rating data that could shade into personal data.
- Pakistan's 2019 E-Commerce Policy references data protection as a stated priority, signaling the direction of travel (a real data protection law is plausible within this product's lifetime) — worth designing data retention/deletion practices as if that law already existed, not scrambling to comply later.

**General (non-Pakistan-specific, but informs risk posture):**
- The controlling precedent, *hiQ Labs v. LinkedIn* (9th Circuit, reaffirmed 2022 post-Supreme-Court remand): scraping **publicly accessible** data does not violate the US Computer Fraud and Abuse Act. This is a US case with no direct authority in Pakistan, but the underlying principle — public product listings are meaningfully different from breaching an authentication wall — is a widely-adopted international norm and a reasonable posture to design around.
- The same case's ending matters more than the headline: hiQ ultimately lost on **breach of contract** (violating LinkedIn's Terms of Service) and was permanently enjoined. **This is the actual risk for Market Intel** — not criminal liability, but a platform's ToS prohibiting scraping/automated access, civil enforcement of that, and reputational/access risk (getting blocked, rate-limited, or sent a cease-and-desist). Daraz's own ToS should be read specifically before scraping begins, not assumed.
- Practical mitigation already partially reflected in the "buy don't build" recommendation (§1): using a managed scraper marketplace (Apify) puts some of this operational/ToS risk on that vendor's infrastructure rather than ours directly — worth understanding Apify's own terms on this before relying on it as a liability shield (it likely isn't one, but it does change who's making the outbound requests).

**Action item, not a decision:** get a real read from counsel (or at minimum a more thorough non-legal review of Daraz's specific ToS) before scraping begins — this research surfaces the shape of the risk, it doesn't clear it.

---

## 6. Technical architecture, if/when in-house scraping is needed

For whichever sources end up scraped in-house (not Daraz, per §1) rather than via a managed marketplace:

- **Headless browser, not raw HTTP:** by 2026 the norm for e-commerce scraping is browser-based rendering (Playwright/Puppeteer), not raw requests — too much of modern e-commerce UI is JS-rendered and fingerprint-checked for a simple HTTP client to pass.
- **Proxy strategy:** residential proxies (not datacenter) are the default for e-commerce scraping specifically, since e-commerce sites aggressively block datacenter IP ranges. Recommended pattern: one browser process, many isolated `BrowserContext`s, each bound to its own proxy — cheap to fan out, each "session" looks like a distinct real user.
- **Stealth layer:** a proxy alone doesn't hide bot *behavior* — realistic user-agent/viewport/locale, `playwright-extra` + stealth plugin, and matching the header set a real browser sends (some naive headless setups omit headers like `Sec-CH-UA` that a real Chrome always sends, which is itself a detectable signal).
- **This mirrors, doesn't replace, our existing job-scraper pattern:** `scripts/scraper/` (orchestrator + one file per source + shared DB writer, run on a schedule) is architecturally sound and should be the shape for any in-house market-intel source too — the difference is e-commerce sites need the headless-browser/proxy layer that RSS-based job sources never did.

---

## 7. Open questions this research still doesn't answer

Carried forward from `overview.md`/`HP.md`, now slightly sharper:

1. **Confirmed v1 sources:** Daraz (via Apify) + one electronics site — still needs your sign-off, and a quick spike to confirm PriceOye/Telemart are actually easier to scrape than Daraz before committing.
2. **First customer:** narrowed to "FMCG/brand marketing teams," not resolved — the `/intel` waitlist already collects the right signal (company name field) to start validating this for real.
3. **Real legal review of Daraz's ToS** before any scraping (managed or in-house) begins.
4. **Pricing tiers** — now anchored against Prisync/Price2Spy's $40–400/mo range instead of a blank guess, still not decided.
