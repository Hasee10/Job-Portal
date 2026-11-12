import { BookOpen, Play, ArrowUpRight } from "lucide-react";
import Link from "next/link";
export function LearningHeader({ kind }: { kind: "guides" | "masterclasses" }) {
  const guides = kind === "guides";
  return (
    <section className="overflow-hidden border-b bg-[#0a3342] text-white">
      <div className="container mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="font-medium text-[#A7E8D3] text-xs uppercase tracking-[.2em]">
            JOBLO / CAREER DEVELOPMENT
          </p>
          <h1 className="mt-4 max-w-xl font-semibold text-4xl leading-tight tracking-tight sm:text-5xl">
            {guides
              ? "A little clarity. A stronger next step."
              : "Make time for your next skill."}
          </h1>
          <p className="mt-5 max-w-xl text-[#c8dbe2] text-base leading-relaxed">
            {guides
              ? "Practical career guides to help you search with focus, present your experience and prepare for the conversations ahead."
              : "Explore video learning for your job search, interviews and career growth. Build confidence one topic at a time."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className={`rounded-lg border px-4 py-2.5 text-sm ${guides ? "border-[#B3EDDA] bg-[#B3EDDA] font-medium text-[#103d40]" : "border-white/25"}`}
              href="/guides"
            >
              Career guides
            </Link>
            <Link
              className={`rounded-lg border px-4 py-2.5 text-sm ${!guides ? "border-[#B3EDDA] bg-[#B3EDDA] font-medium text-[#103d40]" : "border-white/25"}`}
              href="/masterclasses"
            >
              Masterclasses
            </Link>
          </div>
        </div>
        <div className="hidden rounded-2xl border border-white/20 bg-white/5 p-7 lg:block">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#B3EDDA] text-[#103d40]">
            {guides ? (
              <BookOpen size={27} aria-hidden="true" />
            ) : (
              <Play size={27} aria-hidden="true" />
            )}
          </div>
          <p className="mt-6 font-medium text-xl">
            {guides
              ? "Less guesswork. More direction."
              : "Learning that fits your next step."}
          </p>
          <div className="mt-5 space-y-3">
            {[
              "Search with intention",
              "Tell your story clearly",
              "Prepare with confidence",
            ].map((text, index) => (
              <div
                key={text}
                className="flex items-center gap-3 border-t border-white/15 pt-3 text-[#c8dbe2] text-sm"
              >
                <span className="font-mono text-[#A7E8D3] text-xs">
                  0{index + 1}
                </span>
                {text}
                <ArrowUpRight
                  className="ml-auto"
                  size={14}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
