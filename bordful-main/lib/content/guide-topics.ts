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
    title: 'How to Network Without Feeling Fake',
    category: 'Job Search',
    brief:
      'Practical, low-cringe ways to build genuine professional relationships before you need something, not just when job hunting.',
  },
  {
    title: 'Where to Actually Research Salary Data',
    category: 'Negotiation & Offers',
    brief:
      'Concrete sources and methods for finding real compensation numbers for a role, not just vague advice to "research the market."',
  },
  {
    title: 'Switching Careers Without Direct Experience',
    category: 'Career Development',
    brief:
      'How to reframe transferable experience and close real skill gaps when moving into a field you have not worked in before.',
  },
  {
    title: 'Handling a Layoff: The First Two Weeks',
    category: 'Career Development',
    brief:
      'Practical, unsentimental steps to take immediately after a layoff - paperwork, finances, and starting the job search without panic.',
  },
  {
    title: 'Contract vs. Full-Time: How to Actually Decide',
    category: 'Career Development',
    brief:
      'A framework for weighing contract/freelance work against full-time employment based on real tradeoffs, not just income.',
  },
  {
    title: 'Take-Home Interview Assignments: What Evaluators Look For',
    category: 'Interviewing',
    brief:
      'How take-home assignments are actually graded, common mistakes candidates make, and how to scope your time on them.',
  },
  {
    title: 'Asking for a Promotion: Making the Case',
    category: 'Negotiation & Offers',
    brief:
      'How to build and present a case for promotion internally, including timing and what evidence actually moves the decision.',
  },
  {
    title: 'What to Do When You Get Ghosted After an Interview',
    category: 'Job Search',
    brief:
      'Realistic expectations, follow-up etiquette, and when to actually move on after a company stops responding.',
  },
  {
    title: 'Writing a Cover Letter People Actually Read',
    category: 'Resumes & Applications',
    brief:
      'What makes a cover letter worth reading versus generic filler, and when skipping one entirely is the better call.',
  },
  {
    title: 'How to Evaluate a Company Before You Accept an Offer',
    category: 'Negotiation & Offers',
    brief:
      'Practical due diligence - what to actually ask current/former employees, red flags in the interview process itself.',
  },
  {
    title: 'Remote Work Interviews: What Changes',
    category: 'Interviewing',
    brief:
      'How remote-role interviews differ from in-person ones, and what to demonstrate about how you work independently.',
  },
  {
    title: 'Turning Down a Job Offer Gracefully',
    category: 'Negotiation & Offers',
    brief:
      'How to decline an offer without burning the relationship, including what to say and what to avoid.',
  },
  {
    title: 'Reading a Job Description for What It Really Wants',
    category: 'Job Search',
    brief:
      'How to tell which listed requirements are truly mandatory versus aspirational, and how that should shape whether you apply.',
  },
  {
    title: 'What to Do in Your First Week Before You Even Start',
    category: 'Career Development',
    brief:
      'Practical prep between accepting an offer and day one - what is actually useful versus busywork.',
  },
  {
    title: 'How to Ask for Feedback After a Rejection',
    category: 'Job Search',
    brief:
      'Whether and how to request feedback after being turned down, and what to realistically expect back.',
  },
  {
    title: 'Panel Interviews: How to Handle Multiple Interviewers at Once',
    category: 'Interviewing',
    brief:
      'Practical tactics for reading the room, addressing the right person, and managing a group interview format.',
  },
];
