import 'server-only';

import { aiChatCompletion, isAIConfigured } from '@/lib/ai/provider';

export type MatchResult = {
  score: number;
  method: 'ai' | 'skills-overlap';
  reasoning?: string;
};

// Percentage overlap between a resume's skills and a job's skill list. No
// job skills set means every candidate scores 100 - there's no criteria to
// fall short of, so nothing should be penalized against a signal that was
// never configured.
export function computeSkillsOverlapScore(resumeSkills: string[], jobSkills: string[]): number {
  if (jobSkills.length === 0) return 100;
  const normalizedResumeSkills = new Set(resumeSkills.map((s) => s.trim().toLowerCase()));
  const matched = jobSkills.filter((s) => normalizedResumeSkills.has(s.trim().toLowerCase()));
  return Math.round((matched.length / jobSkills.length) * 100);
}

// Splits a job's skill list into what the resume already covers vs. what's
// missing, for the gap-breakdown shown alongside a fit score. Case/whitespace
// insensitive to match computeSkillsOverlapScore's own comparison.
export function diffSkills(
  resumeSkills: string[],
  jobSkills: string[]
): { matchedSkills: string[]; missingSkills: string[] } {
  const normalizedResumeSkills = new Set(resumeSkills.map((s) => s.trim().toLowerCase()));
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const skill of jobSkills) {
    if (normalizedResumeSkills.has(skill.trim().toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }
  return { matchedSkills, missingSkills };
}

const SCORING_SYSTEM_PROMPT =
  'You score how well a candidate fits a job, using only the resume and job ' +
  'details given - never invent experience or requirements not present in ' +
  'the text. Respond with strict JSON only (no markdown fences, no ' +
  'commentary) matching exactly this shape: {"score": number, "reasoning": ' +
  'string}. "score" is an integer 0-100 reflecting overall fit (skills, ' +
  'experience level, and relevance of past roles - not just keyword ' +
  'overlap). "reasoning" is one short sentence (under 25 words) naming the ' +
  "strongest match and the biggest gap.";

function parseScoreResponse(raw: string): { score: number; reasoning: string } | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { score?: unknown; reasoning?: unknown };
    if (typeof parsed.score !== 'number' || !Number.isFinite(parsed.score)) return null;
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    };
  } catch {
    return null;
  }
}

function resumeSummaryText(resume: {
  headline?: string;
  summary?: string;
  skills: string[];
  experience?: { title: string; company: string; description: string }[];
}): string {
  const lines: string[] = [];
  if (resume.headline) lines.push(resume.headline);
  if (resume.summary) lines.push(resume.summary);
  if (resume.experience?.length) {
    lines.push('Experience:');
    for (const job of resume.experience) {
      lines.push(`- ${job.title} at ${job.company}: ${job.description}`);
    }
  }
  if (resume.skills.length) lines.push(`Skills: ${resume.skills.join(', ')}`);
  return lines.join('\n');
}

// Scores a candidate's resume against a job. Always computes the cheap,
// deterministic skills-overlap score first as a guaranteed fallback, then
// tries an AI-based fit assessment (skills + experience relevance, not just
// keyword matching) when a description is available and a provider is
// configured. Any AI failure - not configured, rate limited, malformed
// response - degrades to the overlap score rather than throwing, since a
// match score should never block an application or a digest email from
// going out.
export async function scoreJobMatch(
  resume: {
    headline?: string;
    summary?: string;
    skills: string[];
    experience?: { title: string; company: string; description: string }[];
  },
  job: { title: string; description?: string | null; skills: string[] }
): Promise<MatchResult> {
  const overlapScore = computeSkillsOverlapScore(resume.skills, job.skills);

  if (!isAIConfigured() || !job.description) {
    return { score: overlapScore, method: 'skills-overlap' };
  }

  try {
    const output = await aiChatCompletion(
      [
        { role: 'system', content: SCORING_SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Job: ${job.title}\n${job.description.slice(0, 4000)}\n\n` +
            `Candidate resume:\n${resumeSummaryText(resume)}`,
        },
      ],
      { temperature: 0.2, maxTokens: 200 }
    );
    const parsed = parseScoreResponse(output);
    if (!parsed) return { score: overlapScore, method: 'skills-overlap' };
    return { score: parsed.score, method: 'ai', reasoning: parsed.reasoning };
  } catch (error) {
    console.error('[match-scoring] AI scoring failed, falling back to skills overlap:', error);
    return { score: overlapScore, method: 'skills-overlap' };
  }
}
