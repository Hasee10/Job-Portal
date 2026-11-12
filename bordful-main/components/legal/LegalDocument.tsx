import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
export function LegalDocument({
  title,
  description,
  kind,
  sections,
  children,
}: {
  title: string;
  description: string;
  kind: "privacy" | "terms";
  sections: { id: string; title: string }[];
  children: ReactNode;
}) {
  const Icon = kind === "privacy" ? ShieldCheck : FileText;
  return (
    <main className="bg-muted/20 pb-16">
      <section className="border-b bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <p className="text-muted-foreground text-xs uppercase tracking-widest">
            CALIBER / LEGAL & TRUST
          </p>
          <div className="mt-5 flex items-start gap-5">
            <span className="hidden rounded-2xl border bg-primary/5 p-4 text-[#086b85] dark:text-cyan-200 sm:block">
              <Icon size={28} aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground text-sm leading-7">
                {description}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <span className="text-muted-foreground">
                  Page refreshed November 12, 2026
                </span>
                <Link
                  href={kind === "privacy" ? "/terms" : "/privacy"}
                  className="inline-flex items-center gap-1.5 underline underline-offset-4"
                >
                  {kind === "privacy"
                    ? "Terms of service"
                    : "Privacy & cookies"}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="container mx-auto mt-8 grid max-w-6xl items-start gap-7 px-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border bg-card p-5 lg:sticky lg:top-28">
          <h2 className="font-semibold text-sm">On this page</h2>
          <nav
            aria-label={`${title} contents`}
            className="mt-4 flex flex-col gap-1"
          >
            {sections.map((section, index) => (
              <a
                href={`#${section.id}`}
                key={section.id}
                className="flex gap-3 rounded-lg px-2 py-2.5 text-muted-foreground text-xs leading-5 hover:bg-muted hover:text-foreground"
              >
                <span className="font-mono text-[10px]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </a>
            ))}
          </nav>
          <div className="mt-5 border-t pt-5">
            <p className="font-medium text-sm">Have a question?</p>
            <Link
              href="/contact"
              className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground text-xs underline underline-offset-4"
            >
              Contact Caliber
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </aside>
        <article className="min-w-0 space-y-5 [&_section]:scroll-mt-28 [&_section]:rounded-2xl [&_section]:border [&_section]:bg-card [&_section]:p-6 sm:[&_section]:p-8 [&_h2]:mb-5 [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-base [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:font-medium [&_p]:my-3 [&_p]:text-muted-foreground [&_p]:text-sm [&_p]:leading-7 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:text-muted-foreground [&_li]:text-sm [&_li]:leading-7">
          {children}
        </article>
      </div>
    </main>
  );
}
