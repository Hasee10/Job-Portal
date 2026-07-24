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
    channelId: 'UCXUyg1vYSupswhi0zNeD-5w',
    name: 'Linda Raynier',
    defaultCategory: 'Interviewing',
  },
  {
    channelId: 'UCP1UlYJH_QL4m5HVyikcxfQ',
    name: 'Andrew LaCivita',
    defaultCategory: 'Negotiation & Offers',
  },
  {
    channelId: 'UCAC8Y3gJMuhGsjNWyufUNAQ',
    name: 'Career Contessa',
    defaultCategory: 'Job Search',
  },
  {
    channelId: 'UCWo4IA01TXzBeGJJKWHOG9g',
    name: 'Harvard Business Review',
    defaultCategory: 'Career Development',
  },
  {
    channelId: 'UCk4bbQAZD26f_XdGyb4wwhg',
    name: 'The Muse',
    defaultCategory: 'Job Search',
  },
  {
    channelId: 'UCiQNvBItd1s9Bei2Zkmar4A',
    name: 'The Interview Guys',
    defaultCategory: 'Interviewing',
  },
  {
    channelId: 'UCeNm7lbfRg9wiBDSLQ-M8RA',
    name: 'Self Made Millennial',
    defaultCategory: 'Job Search',
  },
  {
    channelId: 'UCiLeUu6mTGaopeEV1pFDVLA',
    name: 'Josh Doody (Fearless Salary Negotiation)',
    defaultCategory: 'Negotiation & Offers',
  },
  {
    channelId: 'UCmem-D5aeCsSRyXTZkH_gKQ',
    name: 'Jennifer Brick',
    defaultCategory: 'Career Development',
  },
  // Jeff Su's channel is broader productivity/AI-tooling content, not
  // purely career advice - relies more heavily on the relevance keyword
  // filter below to skip his non-career videos than the other channels do.
  {
    channelId: 'UCwAnu01qlnVg1Ai2AbtTMaA',
    name: 'Jeff Su',
    defaultCategory: 'Career Development',
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
  'interview',
  'resume',
  'cv ',
  'salary',
  'negotiat',
  'job search',
  'job offer',
  'career',
  'hiring',
  'recruiter',
  'linkedin',
];

// Keyword -> category, checked in order against the video title first
// (falls back to the channel's defaultCategory if nothing matches).
export const MASTERCLASS_CATEGORY_KEYWORDS: [string, string][] = [
  ['negotiat', 'Negotiation & Offers'],
  ['salary', 'Negotiation & Offers'],
  ['offer', 'Negotiation & Offers'],
  ['interview', 'Interviewing'],
  ['resume', 'Resumes & Applications'],
  ['cv', 'Resumes & Applications'],
  ['cover letter', 'Resumes & Applications'],
  ['network', 'Job Search'],
  ['linkedin', 'Job Search'],
  ['job search', 'Job Search'],
  ['career', 'Career Development'],
  ['promotion', 'Career Development'],
];
