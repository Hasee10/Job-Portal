import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiChatCompletion } from '@/lib/ai/provider';
import { AIProviderError } from '@/lib/ai/types';
import { createRateLimiter } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// In-memory, per-employer - deters accidental runaway usage (e.g. a stuck
// client retry loop), not a hard billing guardrail.
const isRateLimited = createRateLimiter(30);

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type JobDraft = {
  title?: string;
  description?: string;
  type?: string;
  workplaceType?: string;
  workplaceCity?: string;
  workplaceCountry?: string;
  skills?: string;
  requiredSkills?: string[];
};

function draftSummary(draft: JobDraft | undefined): string {
  if (!draft) return 'No draft fields filled in yet.';
  const lines = [
    draft.title && `Title: ${draft.title}`,
    draft.type && `Type: ${draft.type}`,
    draft.workplaceType && `Workplace: ${draft.workplaceType}`,
    (draft.workplaceCity || draft.workplaceCountry) &&
      `Location: ${[draft.workplaceCity, draft.workplaceCountry].filter(Boolean).join(', ')}`,
    draft.skills && `Skills shown on listing: ${draft.skills}`,
    draft.requiredSkills?.length && `Required skills (auto-shortlist): ${draft.requiredSkills.join(', ')}`,
    draft.description && `Current description:\n${draft.description.slice(0, 3000)}`,
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : 'No draft fields filled in yet.';
}

// Static grounding so FAQ answers reflect how this specific board's posting
// form actually works, instead of the model guessing/hallucinating generic
// ATS behavior.
const PLATFORM_CONTEXT = `Platform facts about this job board's "Post a job" form:
- "Skills" is a free-text, comma-separated field shown publicly on the listing.
- "Required skills for auto-shortlisting" is a separate field: applicants whose resume covers enough of these get auto-shortlisted once their match score clears the "Auto-shortlist at match %" threshold (default 70).
- Match score blends resume/job skill overlap with an AI fit assessment of experience relevance.
- "Min. years experience" is informational context for reviewers, not an auto-filter.
- Employers can either accept applications in-app (resume, cover letter, shortlisting dashboard) or set an external apply URL that sends candidates off-platform - in-app is required to use auto-shortlisting/candidate search.
- Career levels are multi-select (Internship through C-Level).
- Listings go live immediately on submit - there is no review/approval step.`;

const SYSTEM_PROMPT = `You are an assistant embedded in a job board's "Post a job" form, helping an employer/recruiter with three things: (1) drafting or rewriting the job description, (2) reviewing a draft before it goes live for missing fields, vague requirements, unrealistic salary, or exclusionary/discriminatory language, and (3) answering questions about how this posting form works.

${PLATFORM_CONTEXT}

Rules:
- When asked to write or rewrite the full job description, respond with ONLY the description text (markdown supported, no preamble like "Here's a draft:") so it can be pasted directly into the form.
- For everything else (review feedback, questions, brainstorming), respond conversationally and concisely.
- Never invent facts about the employer's company or the role beyond what they've told you.
- If the draft looks fine, say so briefly rather than inventing nitpicks.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (isRateLimited(session.user.id)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  const body = await request.json();
  const messages = Array.isArray(body.messages) ? (body.messages as ChatMessage[]) : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'A message is required.' }, { status: 400 });
  }

  const trimmedMessages = messages
    .slice(-MAX_MESSAGES)
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  const draft = body.draft as JobDraft | undefined;

  try {
    const output = await aiChatCompletion(
      [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nCurrent draft:\n${draftSummary(draft)}`,
        },
        ...trimmedMessages,
      ],
      { temperature: 0.5, maxTokens: 1200 }
    );

    return NextResponse.json({ reply: output });
  } catch (error) {
    if (error instanceof AIProviderError && error.notConfigured) {
      return NextResponse.json(
        { error: 'The AI assistant is not available yet on this deployment.' },
        { status: 503 }
      );
    }
    console.error('[api/employer/job-assistant] AI request failed:', error);
    return NextResponse.json(
      { error: 'Failed to reach the assistant. Please try again.' },
      { status: 502 }
    );
  }
}
