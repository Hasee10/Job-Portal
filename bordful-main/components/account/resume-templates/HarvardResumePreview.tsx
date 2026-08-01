import type { TailoredResumeContent } from '@/lib/jobs/tailored-resume-types';

// On-screen preview of the Harvard-style template - visually mirrors
// HarvardResumePdf.tsx so what the user edits here matches the PDF download.
export function HarvardResumePreview({ resume }: { resume: TailoredResumeContent }) {
  return (
    <div className="mx-auto max-w-[680px] bg-white p-10 font-serif text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50">
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-wide uppercase">
          {resume.fullName || 'Your Name'}
        </h1>
        {resume.contact && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{resume.contact}</p>}
        {resume.headline && <p className="mt-1 text-sm italic">{resume.headline}</p>}
      </div>

      {resume.summary && (
        <section className="mt-5">
          <p className="text-sm leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section className="mt-5">
          <h2 className="border-b border-zinc-400 pb-1 text-sm font-bold tracking-wide uppercase">
            Experience
          </h2>
          <div className="mt-2 space-y-3">
            {resume.experience.map((entry, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold">
                    {entry.title}
                    {entry.company ? `, ${entry.company}` : ''}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{entry.dates}</span>
                </div>
                {entry.bullets.filter((bullet) => bullet.trim().length > 0).length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                    {entry.bullets
                      .filter((bullet) => bullet.trim().length > 0)
                      .map((bullet, j) => (
                        <li key={j}>{bullet}</li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.education.length > 0 && (
        <section className="mt-5">
          <h2 className="border-b border-zinc-400 pb-1 text-sm font-bold tracking-wide uppercase">
            Education
          </h2>
          <div className="mt-2 space-y-1">
            {resume.education.map((entry, i) => (
              <div className="flex items-baseline justify-between text-sm" key={i}>
                <span>
                  {entry.degree}
                  {entry.school ? `, ${entry.school}` : ''}
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{entry.year}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section className="mt-5">
          <h2 className="border-b border-zinc-400 pb-1 text-sm font-bold tracking-wide uppercase">
            Skills
          </h2>
          <p className="mt-2 text-sm">{resume.skills.join(' · ')}</p>
        </section>
      )}
    </div>
  );
}
