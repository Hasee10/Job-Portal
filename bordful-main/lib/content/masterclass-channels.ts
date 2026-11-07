// Fixed allowlist of YouTube channels the discovery cron pulls recent
// uploads from - deliberately not an open keyword search across all of
// YouTube, same reasoning as the guide topic queue: bounded, curated
// sources keep quality controllable instead of pulling in whatever
// ranks for a search term.
//
// Only channel IDs I could directly verify (via a real youtube.com/channel/
// URL, not a guessed custom handle) are listed here. Add more by opening
// the channel on YouTube -> Settings -> Advanced -> "Channel ID copied to
// clipboard", or from the URL of a youtube.com/channel/UC... link.
export type MasterclassChannel = {
  channelId: string;
  name: string;
  defaultCategory: string;
};

export const MASTERCLASS_CHANNEL_ALLOWLIST: MasterclassChannel[] = [
  {
    channelId: "UCXUyg1vYSupswhi0zNeD-5w",
    defaultCategory: "Interviewing",
    name: "Linda Raynier",
  },
  {
    channelId: "UCP1UlYJH_QL4m5HVyikcxfQ",
    defaultCategory: "Negotiation & Offers",
    name: "Andrew LaCivita",
  },
  {
    channelId: "UCAC8Y3gJMuhGsjNWyufUNAQ",
    defaultCategory: "Job Search",
    name: "Career Contessa",
  },
  {
    channelId: "UCWo4IA01TXzBeGJJKWHOG9g",
    defaultCategory: "Career Development",
    name: "Harvard Business Review",
  },
  {
    channelId: "UCk4bbQAZD26f_XdGyb4wwhg",
    defaultCategory: "Job Search",
    name: "The Muse",
  },
  {
    channelId: "UCiQNvBItd1s9Bei2Zkmar4A",
    defaultCategory: "Interviewing",
    name: "The Interview Guys",
  },
  {
    channelId: "UCeNm7lbfRg9wiBDSLQ-M8RA",
    defaultCategory: "Job Search",
    name: "Self Made Millennial",
  },
  {
    channelId: "UCiLeUu6mTGaopeEV1pFDVLA",
    defaultCategory: "Negotiation & Offers",
    name: "Josh Doody (Fearless Salary Negotiation)",
  },
  {
    channelId: "UCmem-D5aeCsSRyXTZkH_gKQ",
    defaultCategory: "Career Development",
    name: "Jennifer Brick",
  },
  // Jeff Su's channel is broader productivity/AI-tooling content, not
  // purely career advice - relies more heavily on the relevance keyword
  // filter below to skip his non-career videos than the other channels do.
  {
    channelId: "UCwAnu01qlnVg1Ai2AbtTMaA",
    defaultCategory: "Career Development",
    name: "Jeff Su",
  },
];

// Deliberately excluded despite being on the original requested list:
// Dan Lok and Big Interview each have multiple candidate channels online
// with no reliable way to confirm which one is truly official - safer to
// leave them out than misattribute discovered videos to the wrong
// channel. Big Interview's single most relevant video was still hand-
// verified and seeded directly (see the initial 4 seeded masterclasses).

// A discovered video's title/description must contain at least one of
// these to be considered - filters out a channel's unrelated content
// (e.g. a coach posting about topics outside job search/interviewing)
// without needing a second AI call just to judge relevance.
export const MASTERCLASS_RELEVANCE_KEYWORDS = [
  "interview",
  "resume",
  "cv ",
  "salary",
  "negotiat",
  "job search",
  "job offer",
  "career",
  "hiring",
  "recruiter",
  "linkedin",
];

// Keyword -> category, checked in order against the video title first
// (falls back to the channel's defaultCategory if nothing matches).
export const MASTERCLASS_CATEGORY_KEYWORDS: [string, string][] = [
  ["negotiat", "Negotiation & Offers"],
  ["salary", "Negotiation & Offers"],
  ["offer", "Negotiation & Offers"],
  ["interview", "Interviewing"],
  ["resume", "Resumes & Applications"],
  ["cv", "Resumes & Applications"],
  ["cover letter", "Resumes & Applications"],
  ["network", "Job Search"],
  ["linkedin", "Job Search"],
  ["job search", "Job Search"],
  ["career", "Career Development"],
  ["promotion", "Career Development"],
];
