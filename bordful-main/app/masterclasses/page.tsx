import type { Metadata } from "next";
import { MasterclassGrid } from "@/components/content/MasterclassGrid";
import config from "@/config";
import { LearningHeader } from "@/components/content/LearningHeader";
import { STARTER_GUIDES } from "@/lib/content/starter-guides";
import { BookOpen, ArrowRight, Video } from "lucide-react";
import Link from "next/link";
import { listPublishedMasterclasses } from "@/lib/content/masterclass-actions";

export const metadata: Metadata = {
  description:
    "Video sessions with hiring experts on job searching and interviewing.",
  title: `Masterclasses | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function MasterclassesPage() {
  const masterclasses = await listPublishedMasterclasses().catch(() => []);

  return (
    <main className="bg-muted/20 pb-16">
      <LearningHeader kind="masterclasses" />
      <div className="container mx-auto max-w-6xl px-4 py-10">
        {masterclasses.length ? (
          <>
            <h2 className="font-semibold text-2xl">
              Explore the video library
            </h2>
            <MasterclassGrid masterclasses={masterclasses} />
          </>
        ) : (
          <>
            <section className="grid overflow-hidden rounded-2xl border bg-card md:grid-cols-[1fr_1.4fr]">
              <div className="flex min-h-48 flex-col items-center justify-center gap-4 bg-[#e5f2f4] px-6 py-10 text-[#086b85] dark:bg-[#123e4b] dark:text-cyan-200">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-current">
                  <Video size={28} aria-hidden="true" />
                </span>
                <p className="text-xs uppercase tracking-widest">
                  VIDEO LEARNING
                </p>
              </div>
              <div className="p-7 sm:p-10">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
                  THE SESSION LIBRARY
                </p>
                <h2 className="mt-3 font-semibold text-2xl">
                  No published sessions yet.
                </h2>
                <p className="mt-4 text-muted-foreground text-sm leading-7">
                  There are no videos available to watch right now. Start with
                  our practical reading guides while the session library takes
                  shape.
                </p>
                <Link
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#086b85] px-4 py-3 font-medium text-white text-sm"
                  href="/guides"
                >
                  Explore career guides
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </section>
            <div className="mt-12">
              <p className="text-muted-foreground text-xs uppercase tracking-widest">
                KEEP MAKING PROGRESS
              </p>
              <h2 className="mt-2 font-semibold text-2xl">
                Choose a topic to work on today
              </h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {STARTER_GUIDES.slice(0, 3).map((guide) => (
                  <Link
                    key={guide.id}
                    href={`/guides/${guide.slug}`}
                    className="rounded-2xl border bg-card p-6 hover:border-primary/50"
                  >
                    <BookOpen
                      size={23}
                      className="text-[#086b85] dark:text-cyan-200"
                      aria-hidden="true"
                    />
                    <p className="mt-5 text-muted-foreground text-xs uppercase tracking-widest">
                      {guide.category}
                    </p>
                    <h3 className="mt-3 font-semibold text-lg leading-snug">
                      {guide.title}
                    </h3>
                    <p className="mt-3 text-muted-foreground text-sm leading-6">
                      {guide.summary}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 font-medium text-sm">
                      Read the guide
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
