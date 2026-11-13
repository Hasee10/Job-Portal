import type { Metadata } from "next";
import { GuideLibrary } from "@/components/content/GuideLibrary";
import config from "@/config";
import { STARTER_GUIDES } from "@/lib/content/starter-guides";
import { LearningHeader } from "@/components/content/LearningHeader";
import { listPublishedGuides } from "@/lib/content/guide-actions";

export const metadata: Metadata = {
  description: "Practical guides to help you search, apply, and negotiate.",
  title: `Career Guides | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function GuidesPage() {
  const published = await listPublishedGuides().catch(() => []);
  const guides = published.length ? published : STARTER_GUIDES;

  return (
    <main className="bg-muted/20 pb-16">
      <LearningHeader kind="guides" />
      <section className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">
              YOUR CAREER TOOLKIT
            </p>
            <h2 className="mt-2 font-semibold text-2xl">
              Find the guidance you need
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground text-sm">
            Clear explanations. Practical next steps. Read at your own pace.
          </p>
        </div>
        <div className="mt-7">
          <GuideLibrary guides={guides} />
        </div>
      </section>
    </main>
  );
}
