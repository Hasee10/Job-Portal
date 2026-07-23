'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type {
  ResumeContent,
  ResumeEducation,
  ResumeExperience,
} from '@/lib/jobs/resume-actions';

const EMPTY_RESUME_CONTENT: ResumeContent = {
  fullName: '',
  headline: '',
  summary: '',
  experience: [],
  education: [],
  skills: [],
};

function emptyExperience(): ResumeExperience {
  return { title: '', company: '', startDate: '', endDate: '', description: '' };
}

function emptyEducation(): ResumeEducation {
  return { school: '', degree: '', year: '' };
}

export function ResumeBuilder({
  initialContent,
  targetJob = null,
}: {
  initialContent: ResumeContent;
  targetJob?: { id: string; title: string; company: string } | null;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState<ResumeContent>(
    initialContent.fullName || initialContent.experience.length
      ? initialContent
      : EMPTY_RESUME_CONTENT
  );
  const [skillsInput, setSkillsInput] = useState(content.skills.join(', '));
  const [isSaving, setIsSaving] = useState(false);

  const [jobDescription, setJobDescription] = useState('');
  const [mode, setMode] = useState<'resume' | 'cover-letter'>('resume');
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoredOutput, setTailoredOutput] = useState<string | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMatches, setUploadMatches] = useState<
    { jobId: string; title: string; company: string; matchedSkills: string[] }[]
  >([]);

  const updateExperience = (index: number, patch: Partial<ResumeExperience>) => {
    setContent((prev) => ({
      ...prev,
      experience: prev.experience.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry
      ),
    }));
  };

  const updateEducation = (index: number, patch: Partial<ResumeEducation>) => {
    setContent((prev) => ({
      ...prev,
      education: prev.education.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry
      ),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload: ResumeContent = { ...content, skills };

      const response = await fetch('/api/seeker/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload }),
      });
      if (!response.ok) throw new Error('Failed to save resume.');

      setContent(payload);
      toast({ title: 'Resume saved' });
    } catch {
      toast({
        title: 'Could not save resume',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadMatches([]);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/seeker/resume/upload', {
        method: 'POST',
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to parse resume.');

      const parsed = data.resume.content as ResumeContent;
      setContent(parsed);
      setSkillsInput(parsed.skills.join(', '));
      setUploadMatches(data.matches ?? []);
      toast({
        title: 'Resume parsed',
        description:
          data.matches?.length > 0
            ? `Found ${data.matches.length} matching job${data.matches.length > 1 ? 's' : ''} - check your email too.`
            : 'Review the details below and save.',
      });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Something went wrong.'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTailor = async () => {
    if (!targetJob && !jobDescription.trim()) {
      setTailorError('Paste a job description first.');
      return;
    }
    setIsTailoring(true);
    setTailorError(null);
    setTailoredOutput(null);
    setUpgradeRequired(false);
    try {
      const response = await fetch('/api/seeker/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          targetJob
            ? { mode, jobId: targetJob.id, resume: content }
            : { mode, jobDescription, resume: content }
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        setUpgradeRequired(Boolean(data.upgradeRequired));
        throw new Error(data.error || 'Failed to generate tailored content.');
      }
      setTailoredOutput(data.output);
    } catch (error) {
      setTailorError(
        error instanceof Error ? error.message : 'Something went wrong.'
      );
    } finally {
      setIsTailoring(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border p-6">
        <h2 className="font-semibold text-lg">Upload an existing resume</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Upload a PDF resume and we&apos;ll fill in the details below
          automatically, then email you jobs that match your skills.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            ref={fileInputRef}
            type="file"
          />
          <Button
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            {isUploading ? 'Parsing...' : 'Upload PDF resume'}
          </Button>
        </div>
        {uploadError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {uploadError}
          </p>
        )}
        {uploadMatches.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="font-medium text-sm">
              {uploadMatches.length} job{uploadMatches.length > 1 ? 's' : ''}{' '}
              match your skills:
            </p>
            <ul className="space-y-1">
              {uploadMatches.map((match) => (
                <li className="text-sm" key={match.jobId}>
                  <span className="font-medium">{match.title}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {' '}
                    at {match.company} &mdash; matches: {match.matchedSkills.join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="font-semibold text-lg">Resume details</h2>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="fullName">
                Full name
              </label>
              <Input
                className="mt-1"
                id="fullName"
                onChange={(e) => setContent((p) => ({ ...p, fullName: e.target.value }))}
                value={content.fullName}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="headline">
                Headline
              </label>
              <Input
                className="mt-1"
                id="headline"
                onChange={(e) => setContent((p) => ({ ...p, headline: e.target.value }))}
                placeholder="e.g. Senior Product Designer"
                value={content.headline}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="summary">
              Summary
            </label>
            <Textarea
              className="mt-1"
              id="summary"
              onChange={(e) => setContent((p) => ({ ...p, summary: e.target.value }))}
              placeholder="A 2-3 sentence overview of your experience and what you're looking for next."
              rows={3}
              value={content.summary}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="skills">
              Skills (comma-separated)
            </label>
            <Input
              className="mt-1"
              id="skills"
              onChange={(e) => setSkillsInput(e.target.value)}
              value={skillsInput}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Experience</span>
              <Button
                onClick={() =>
                  setContent((p) => ({
                    ...p,
                    experience: [...p.experience, emptyExperience()],
                  }))
                }
                size="xs"
                type="button"
                variant="outline"
              >
                Add role
              </Button>
            </div>
            <div className="mt-2 space-y-4">
              {content.experience.map((entry, i) => (
                <div className="rounded-md border p-3" key={`experience-${i}`}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      onChange={(e) => updateExperience(i, { title: e.target.value })}
                      placeholder="Job title"
                      value={entry.title}
                    />
                    <Input
                      onChange={(e) => updateExperience(i, { company: e.target.value })}
                      placeholder="Company"
                      value={entry.company}
                    />
                    <Input
                      onChange={(e) => updateExperience(i, { startDate: e.target.value })}
                      placeholder="Start (e.g. 2021)"
                      value={entry.startDate}
                    />
                    <Input
                      onChange={(e) => updateExperience(i, { endDate: e.target.value })}
                      placeholder="End (e.g. Present)"
                      value={entry.endDate}
                    />
                  </div>
                  <Textarea
                    className="mt-2"
                    onChange={(e) => updateExperience(i, { description: e.target.value })}
                    placeholder="What did you work on?"
                    rows={2}
                    value={entry.description}
                  />
                  <Button
                    className="mt-2"
                    onClick={() =>
                      setContent((p) => ({
                        ...p,
                        experience: p.experience.filter((_, idx) => idx !== i),
                      }))
                    }
                    size="xs"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Education</span>
              <Button
                onClick={() =>
                  setContent((p) => ({
                    ...p,
                    education: [...p.education, emptyEducation()],
                  }))
                }
                size="xs"
                type="button"
                variant="outline"
              >
                Add education
              </Button>
            </div>
            <div className="mt-2 space-y-3">
              {content.education.map((entry, i) => (
                <div className="grid gap-2 sm:grid-cols-3" key={`education-${i}`}>
                  <Input
                    onChange={(e) => updateEducation(i, { school: e.target.value })}
                    placeholder="School"
                    value={entry.school}
                  />
                  <Input
                    onChange={(e) => updateEducation(i, { degree: e.target.value })}
                    placeholder="Degree"
                    value={entry.degree}
                  />
                  <Input
                    onChange={(e) => updateEducation(i, { year: e.target.value })}
                    placeholder="Year"
                    value={entry.year}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button disabled={isSaving} onClick={handleSave} type="button">
            {isSaving ? 'Saving...' : 'Save resume'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="font-semibold text-lg">Tailor for a job</h2>
        {targetJob ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tailoring for{' '}
            <span className="font-medium text-foreground">
              {targetJob.title} at {targetJob.company}
            </span>
            . We&apos;ll use that job&apos;s description automatically.
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Paste a job description and get an AI-tailored resume or cover
            letter based only on what&apos;s in your resume above.
          </p>
        )}
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={() => setMode('resume')}
              size="xs"
              type="button"
              variant={mode === 'resume' ? 'default' : 'outline'}
            >
              Tailored resume
            </Button>
            <Button
              onClick={() => setMode('cover-letter')}
              size="xs"
              type="button"
              variant={mode === 'cover-letter' ? 'default' : 'outline'}
            >
              Cover letter
            </Button>
          </div>
          {!targetJob && (
            <Textarea
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here"
              rows={6}
              value={jobDescription}
            />
          )}
          <Button disabled={isTailoring} onClick={handleTailor} type="button">
            {isTailoring ? 'Generating...' : 'Generate'}
          </Button>
          {tailorError && upgradeRequired && (
            <div className="rounded-md border border-dashed p-3 text-sm">
              <p>{tailorError}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Premium plans are coming soon.
              </p>
            </div>
          )}
          {tailorError && !upgradeRequired && (
            <p className="text-sm text-red-600 dark:text-red-400">{tailorError}</p>
          )}
          {tailoredOutput && (
            <div className="rounded-md border bg-zinc-50 p-4 text-sm whitespace-pre-wrap dark:bg-zinc-900">
              {tailoredOutput}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
