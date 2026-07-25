import 'server-only';

import { aiChatCompletion } from '@/lib/ai/provider';
import { AIProviderError } from '@/lib/ai/types';
import { EMPTY_RESUME_CONTENT, type ResumeContent } from '@/lib/jobs/resume-actions';

export const MAX_RESUME_FILE_BYTES = 4 * 1024 * 1024;
const MAX_SUMMARY_FALLBACK_LENGTH = 2000;

const EXTRACTION_SYSTEM_PROMPT =
  'You extract structured resume data from raw resume text. Only use ' +
  'information explicitly present in the text - never invent employers, ' +
  'dates, schools, or skills. Respond with strict JSON only (no markdown ' +
  'fences, no commentary) matching exactly this shape: {"fullName": string, ' +
  '"headline": string, "summary": string, "experience": [{"title": string, ' +
  '"company": string, "startDate": string, "endDate": string, ' +
  '"description": string}], "education": [{"school": string, "degree": ' +
  'string, "year": string}], "skills": string[]}. Use empty string/array ' +
  'values for anything not present in the text.';

function parseExtractedContent(raw: string): ResumeContent {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain JSON.');
  }
  const parsed = JSON.parse(jsonMatch[0]) as Partial<ResumeContent>;
  return {
    fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
    headline: typeof parsed.headline === 'string' ? parsed.headline : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    experience: Array.isArray(parsed.experience)
      ? parsed.experience.map((entry) => ({
          title: entry?.title ?? '',
          company: entry?.company ?? '',
          startDate: entry?.startDate ?? '',
          endDate: entry?.endDate ?? '',
          description: entry?.description ?? '',
        }))
      : [],
    education: Array.isArray(parsed.education)
      ? parsed.education.map((entry) => ({
          school: entry?.school ?? '',
          degree: entry?.degree ?? '',
          year: entry?.year ?? '',
        }))
      : [],
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.filter((s): s is string => typeof s === 'string')
      : [],
  };
}

// Parses a PDF resume into structured content via AI extraction. Shared by
// the standalone resume upload flow and the in-app job application flow so
// both produce identical ResumeContent shapes.
//
// The AI step (model call + JSON parse) is allowed to fail without failing
// the whole operation - a flaky provider response, a truncated completion,
// or an unusual resume layout shouldn't block someone from submitting a job
// application. On failure we fall back to a plain-text summary built
// directly from the extracted PDF text, so the resume is still attached and
// reviewable, just without AI-parsed structure (skills/experience/education
// come back empty in that case).
export async function extractResumeFromPdf(file: File): Promise<ResumeContent> {
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF resumes are supported right now.');
  }
  if (file.size > MAX_RESUME_FILE_BYTES) {
    throw new Error('File is too large (max 4MB).');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pdfParse = (await import('pdf-parse')).default;
  const parsed = await pdfParse(buffer);
  const rawText = parsed.text.trim();

  if (!rawText) {
    throw new Error("That PDF didn't contain any extractable text.");
  }

  try {
    const output = await aiChatCompletion(
      [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: rawText.slice(0, 8000) },
      ],
      { temperature: 0.1, maxTokens: 3000 }
    );
    return parseExtractedContent(output);
  } catch (error) {
    // Not configured is a deliberate, actionable signal for the caller (a
    // clean 503 instead of pretending extraction half-worked) - let it
    // propagate. Everything else (flaky provider response, truncated
    // completion, malformed JSON, unusual resume layout) degrades to a
    // plain-text fallback instead of blocking the operation entirely.
    if (error instanceof AIProviderError && error.notConfigured) throw error;

    console.error('[resume-extraction] AI extraction failed, falling back to raw text:', error);
    return {
      ...EMPTY_RESUME_CONTENT,
      summary: rawText.slice(0, MAX_SUMMARY_FALLBACK_LENGTH),
    };
  }
}
