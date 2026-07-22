import type { Metadata } from 'next';
import config from '@/config';
import { listPublishedMasterclasses } from '@/lib/content/masterclass-actions';

export const metadata: Metadata = {
  title: `MasterClasses | ${config.title}`,
  description:
    'Video sessions with hiring experts on job searching and interviewing.',
};

export const dynamic = 'force-dynamic';

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export default async function MasterclassesPage() {
  const masterclasses = await listPublishedMasterclasses();

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-bold text-2xl">MasterClasses</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Video sessions with hiring experts on job searching and
            interviewing.
          </p>

          {masterclasses.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium text-sm">
                MasterClasses are launching soon.
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                We&apos;re lining up sessions with hiring experts - check
                back soon.
              </p>
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {masterclasses.map((mc) => (
                <li className="rounded-lg border p-6" key={mc.id}>
                  <h2 className="font-semibold text-lg">{mc.title}</h2>
                  {(mc.instructorName || mc.instructorTitle) && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {[mc.instructorName, mc.instructorTitle]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  {mc.description && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {mc.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDuration(mc.durationMinutes) && (
                      <span>{formatDuration(mc.durationMinutes)}</span>
                    )}
                    {mc.videoUrl && (
                      <a
                        className="underline"
                        href={mc.videoUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Watch
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
