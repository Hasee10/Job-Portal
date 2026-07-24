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
];

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
