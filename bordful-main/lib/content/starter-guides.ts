import type { CareerGuide } from "./guide-actions";
// Original editorial starter content. No invented authors or publication dates.
const CONTENT = [
  {
    slug: "a-focused-job-search",
    title: "Build a job search you can actually manage",
    category: "Job search",
    summary:
      "Turn a broad search into a short list of roles, a realistic routine and clear next steps.",
    content: `## Define your next role
Write down two or three role families you would consider, the locations or remote arrangements that work for you, and the responsibilities you want to take on. Separate requirements from preferences so an attractive title does not distract you from a poor fit.

## Create a useful shortlist
Read the responsibilities before applying. Note the skills you can demonstrate, the questions you would ask, and the application deadline. Save a small number of relevant roles rather than collecting a list you never revisit.

## Keep one application record
Track the role, company, application date, contact, current status and next action. A simple record helps you avoid duplicate applications and prepare for a conversation without searching old messages.

## Review your approach
Set aside a regular time to check what is working. If applications receive few responses, review targeting and evidence in your resume. If interviews are the sticking point, practice explaining your decisions and contributions.

## Your next step
Choose three relevant opportunities. For each one, write a short note connecting a real example of your work to an important responsibility. Use those notes to decide where to focus.`,
  },
  {
    slug: "a-resume-that-shows-impact",
    title: "Write a resume that shows your impact",
    category: "Resumes",
    summary:
      "Replace vague responsibilities with clear evidence of your skills, decisions and results.",
    content: `## Start with the role
Read the job description and identify the responsibilities that matter most. Select examples from your experience that address those needs. Tailoring means choosing relevant evidence, not copying requirements you cannot support.

## Write evidence-based bullets
Describe what you did, the context and the outcome. For example: “Redesigned the weekly reporting process, reducing manual preparation from four hours to one.” Use numbers only when you can explain where they came from. When measurement is unavailable, describe the practical result clearly.

## Make the structure easy to scan
Use descriptive section headings, consistent dates and a readable font. Put recent, relevant experience first. Keep contact details accurate and check that links work. A simple layout is easier to maintain than a document built from text boxes and decorative charts.

## Be accurate about your contribution
Distinguish your individual work from the wider team's result. Explain your decisions and tools without presenting team achievements as work you completed alone. Keep claims consistent with what you can discuss in an interview.

## Before you submit
Proofread the exported document. Check page breaks, spacing, filenames and contact information. Ask someone to find your strongest relevant example in a quick scan. If it is hard to find, improve the hierarchy rather than adding more text.`,
  },
  {
    slug: "prepare-for-a-better-interview",
    title: "Prepare examples for a better interview",
    category: "Interviews",
    summary:
      "Build a small bank of real stories so you can explain your experience with clarity and confidence.",
    content: `## Understand the conversation
Review the role, the interview format and the people you will meet when that information is available. Prepare questions about the work and the team rather than trying to predict every possible question.

## Build an example bank
Choose several real situations covering collaboration, a difficult decision, a setback and an achievement. For each, note the context, your responsibility, the action you took and what happened. Include what you would improve next time.

## Practice the explanation
Explain an example aloud in a few minutes. Be specific about what you contributed and why you chose that approach. Avoid memorizing a script: the goal is to make your thinking understandable and leave room for follow-up questions.

## Ask useful questions
Ask how success will be measured, what the first priorities are and how the team works together. Listen for details that help you decide whether the role is suitable for you.

## Close with clarity
Confirm the next steps and expected timeline. After the conversation, record what you learned and any follow-up you promised. Do not share confidential information from previous employers in examples or work samples.`,
  },
  {
    slug: "choose-your-next-career-step",
    title: "Choose your next career step with intention",
    category: "Career planning",
    summary:
      "Compare opportunities against the work, learning and conditions that matter to you.",
    content: `## Name your priorities
List the things you want to change and the things you want to keep. Consider the work itself, learning, working arrangements, responsibilities and team environment. Rank a few priorities instead of treating everything as equally important.

## Look for evidence
Use the job description and conversations to gather specific information. Ask what a typical week looks like, which problems need attention and what support is available. A job title alone does not explain the scope of a role.

## Identify a realistic skill gap
Choose a skill relevant to the work you want to do. Define a small practical project or exercise that will let you demonstrate it. Keep the scope manageable and explain the decisions you made, not only the tools you used.

## Compare opportunities consistently
Use the same questions for each opportunity. Write down uncertainties as well as benefits. Avoid treating assumptions as confirmed facts. If an important detail is unclear, ask before making a decision.

## Make the next step concrete
Choose one action for this week: update a relevant resume section, speak to someone doing the work, complete a small project or apply to a well-matched role. Review what you learn before planning a much larger change.`,
  },
];
export const STARTER_GUIDES: CareerGuide[] = CONTENT.map((guide, index) => ({
  ...guide,
  id: `joblo-editorial-${index}`,
  publishedAt: null,
  archivedAt: null,
}));
