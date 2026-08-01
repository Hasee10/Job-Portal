// Structured shape for an AI-tailored resume (as opposed to a plain-text
// blob) - lets the client render it as a formatted document and let the
// user live-edit individual fields before exporting to PDF. Not in
// resume-actions.ts because that file is 'server-only' and this type needs
// to be importable from client components.

export type TailoredResumeExperience = {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
};

export type TailoredResumeEducation = {
  school: string;
  degree: string;
  year: string;
};

export type TailoredResumeContent = {
  fullName: string;
  contact: string;
  headline: string;
  summary: string;
  experience: TailoredResumeExperience[];
  education: TailoredResumeEducation[];
  skills: string[];
};

export function isTailoredResumeContent(value: unknown): value is TailoredResumeContent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.fullName === 'string' &&
    typeof v.headline === 'string' &&
    typeof v.summary === 'string' &&
    Array.isArray(v.experience) &&
    Array.isArray(v.education) &&
    Array.isArray(v.skills)
  );
}
