import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiChatCompletion } from '@/lib/ai/provider';
import { AIProviderError } from '@/lib/ai/types';
import { createRateLimiter } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// In-memory, per-seeker - deters accidental runaway usage, not a hard billing guardrail.
const isRateLimited = createRateLimiter(30);

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// The model is told not to use markdown, but strip it defensively anyway -
// asterisks/hashes/backticks rendered literally (not as bold/headers) in the
// plain-text chat bubble/textarea, which just looked like broken AI slop.
function stripMarkdown(text: string): string {
  return text
    .replace(/^```[a-z]*\n?/gim, '')
    .replace(/```\s*$/gim, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^[ \t]*[-*]\s+/gm, '- ')
    .trim();
}

type ResumeDraft = {
  fullName?: string;
  headline?: string;
  summary?: string;
  skills?: string[];
  experience?: { title?: string; company?: string; startDate?: string; endDate?: string; description?: string }[];
  education?: { school?: string; degree?: string; year?: string }[];
  targetJob?: { title?: string; company?: string } | null;
};

function draftSummary(draft: ResumeDraft | undefined): string {
  if (!draft) return 'No resume details filled in yet.';
  const lines = [
    draft.fullName && `Name: ${draft.fullName}`,
    draft.headline && `Headline: ${draft.headline}`,
    draft.summary && `Current summary:\n${draft.summary}`,
    draft.skills?.length && `Skills: ${draft.skills.join(', ')}`,
    draft.experience?.length &&
      `Experience:\n${draft.experience
        .map((e) => `- ${e.title || 'Untitled role'} at ${e.company || 'Unknown'} (${e.startDate || '?'} - ${e.endDate || '?'}): ${e.description || 'no description'}`)
        .join('\n')}`,
    draft.education?.length &&
      `Education:\n${draft.education.map((e) => `- ${e.degree || ''} at ${e.school || ''} (${e.year || ''})`).join('\n')}`,
    draft.targetJob && `Currently tailoring for: ${draft.targetJob.title} at ${draft.targetJob.company}`,
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : 'No resume details filled in yet.';
}

// Static grounding so FAQ answers reflect how this specific resume builder
// actually works, instead of the model guessing/hallucinating generic advice.
const PLATFORM_CONTEXT = `Platform facts about this job board's resume builder:
- Job seekers can upload a PDF resume to auto-fill the form below, or fill in Full name / Headline / Summary / Skills / Experience / Education manually.
- "Skills" is comma-separated and used to match against job postings' required skills.
- The "Tailor for a job" section generates an AI-tailored resume or cover letter from the saved resume content above, either against a specific job (auto-filled) or a pasted job description.
- Tailoring is rate-limited per account tier; free-tier limits can be hit and require waiting or upgrading (premium plans are coming soon, not live yet).
- Saving the resume (the "Save resume" button) is what persists changes - editing fields alone does not save them.`;

const SYSTEM_PROMPT = `You are an assistant embedded in a job board's resume builder page, helping a job seeker with: (1) writing or improving their summary, headline, or experience bullet points, (2) reviewing their resume for clarity, gaps, or missing keywords relevant to a target role, and (3) answering questions about how this resume builder / tailoring feature works.

${PLATFORM_CONTEXT}

Rules:
- When asked to write or rewrite a specific field (summary, headline, or an experience bullet), respond with ONLY that text (no preamble like "Here's a draft:") so it can be pasted directly into the form.
- Never use markdown syntax anywhere in your replies - no **bold**, no # headings, no backticks, no asterisk bullets. Plain text only, plain hyphens (-) for lists.
- For everything else (review feedback, questions, brainstorming), respond conversationally and concisely.
- Never invent facts about the seeker's work history, employers, or skills beyond what they've told you or is already in their saved resume content.
- If the resume looks fine, say so briefly rather than inventing nitpicks.
- This chat cannot generate a full tailored resume for a specific job - if asked, tell the user to use the "Tailor for a job" section further down this page instead, which is built for that.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
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

  const draft = body.draft as ResumeDraft | undefined;

  try {
    const output = await aiChatCompletion(
      [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nCurrent resume:\n${draftSummary(draft)}`,
        },
        ...trimmedMessages,
      ],
      { temperature: 0.5, maxTokens: 1200 }
    );

    return NextResponse.json({ reply: stripMarkdown(output) });
  } catch (error) {
    if (error instanceof AIProviderError && error.notConfigured) {
      return NextResponse.json(
        { error: 'The AI assistant is not available yet on this deployment.' },
        { status: 503 }
      );
    }
    console.error('[api/seeker/resume-assistant] AI request failed:', error);
    return NextResponse.json(
      { error: 'Failed to reach the assistant. Please try again.' },
      { status: 502 }
    );
  }
}
