// Candidate topics for the monthly guide-generation cron, matched against
// the existing category set in lib/constants/guide-categories.ts. This is
// a fixed queue rather than an AI "pick a topic" step - keeps generation
// cheap (one AI call per guide, not two) and avoids the model drifting
// toward vague or overlapping topics over time. Once every topic here has
// a corresponding guide, the cron simply stops producing new drafts
// instead of inventing filler ones.
export type GuideTopic = {
  title: string;
  category: string;
  brief: string;
};

export const GUIDE_TOPIC_QUEUE: GuideTopic[] = [
  {
    brief:
      "Practical, low-cringe ways to build genuine professional relationships before you need something, not just when job hunting.",
    category: "Job Search",
    title: "How to Network Without Feeling Fake",
  },
  {
    brief:
      'Concrete sources and methods for finding real compensation numbers for a role, not just vague advice to "research the market."',
    category: "Negotiation & Offers",
    title: "Where to Actually Research Salary Data",
  },
  {
    brief:
      "How to reframe transferable experience and close real skill gaps when moving into a field you have not worked in before.",
    category: "Career Development",
    title: "Switching Careers Without Direct Experience",
  },
  {
    brief:
      "Practical, unsentimental steps to take immediately after a layoff - paperwork, finances, and starting the job search without panic.",
    category: "Career Development",
    title: "Handling a Layoff: The First Two Weeks",
  },
  {
    brief:
      "A framework for weighing contract/freelance work against full-time employment based on real tradeoffs, not just income.",
    category: "Career Development",
    title: "Contract vs. Full-Time: How to Actually Decide",
  },
  {
    brief:
      "How take-home assignments are actually graded, common mistakes candidates make, and how to scope your time on them.",
    category: "Interviewing",
    title: "Take-Home Interview Assignments: What Evaluators Look For",
  },
  {
    brief:
      "How to build and present a case for promotion internally, including timing and what evidence actually moves the decision.",
    category: "Negotiation & Offers",
    title: "Asking for a Promotion: Making the Case",
  },
  {
    brief:
      "Realistic expectations, follow-up etiquette, and when to actually move on after a company stops responding.",
    category: "Job Search",
    title: "What to Do When You Get Ghosted After an Interview",
  },
  {
    brief:
      "What makes a cover letter worth reading versus generic filler, and when skipping one entirely is the better call.",
    category: "Resumes & Applications",
    title: "Writing a Cover Letter People Actually Read",
  },
  {
    brief:
      "Practical due diligence - what to actually ask current/former employees, red flags in the interview process itself.",
    category: "Negotiation & Offers",
    title: "How to Evaluate a Company Before You Accept an Offer",
  },
  {
    brief:
      "How remote-role interviews differ from in-person ones, and what to demonstrate about how you work independently.",
    category: "Interviewing",
    title: "Remote Work Interviews: What Changes",
  },
  {
    brief:
      "How to decline an offer without burning the relationship, including what to say and what to avoid.",
    category: "Negotiation & Offers",
    title: "Turning Down a Job Offer Gracefully",
  },
  {
    brief:
      "How to tell which listed requirements are truly mandatory versus aspirational, and how that should shape whether you apply.",
    category: "Job Search",
    title: "Reading a Job Description for What It Really Wants",
  },
  {
    brief:
      "Practical prep between accepting an offer and day one - what is actually useful versus busywork.",
    category: "Career Development",
    title: "What to Do in Your First Week Before You Even Start",
  },
  {
    brief:
      "Whether and how to request feedback after being turned down, and what to realistically expect back.",
    category: "Job Search",
    title: "How to Ask for Feedback After a Rejection",
  },
  {
    brief:
      "Practical tactics for reading the room, addressing the right person, and managing a group interview format.",
    category: "Interviewing",
    title: "Panel Interviews: How to Handle Multiple Interviewers at Once",
  },
];
