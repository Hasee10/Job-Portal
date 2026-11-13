import type { Metadata } from "next";
import Link from "next/link";
import {
  Mail,
  ArrowUpRight,
  CircleHelp,
  BriefcaseBusiness,
  Building2,
  ShieldCheck,
  Check,
} from "lucide-react";
import config from "@/config";
import { ContactSchema } from "@/components/ui/contact-schema";
export const metadata: Metadata = {
  title: `Contact | ${config.nav.title}`,
  description:
    "Questions about Jobs, Procurement or your account? Find the right way to contact Quantus.",
  alternates: { canonical: "/contact" },
};
export const dynamic = "force-static";
export default function ContactPage() {
  const email = config.contact.contactInfo.email;
  const routes = [
    {
      title: "Jobs & your account",
      description:
        "Questions about job listings, applications, resumes or signing in.",
      icon: BriefcaseBusiness,
      subject: "Jobs and account support",
    },
    {
      title: "Business & procurement",
      description:
        "Help with business profiles, connections, requests or supplier workflows.",
      icon: Building2,
      subject: "Business and procurement support",
    },
    {
      title: "Privacy & other inquiries",
      description:
        "Questions about personal information, feedback or general inquiries.",
      icon: ShieldCheck,
      subject: "Privacy or general inquiry",
    },
  ];
  return (
    <main className="bg-muted/20 pb-16">
      <ContactSchema
        companyName={config.nav.title}
        email={email}
        phone={config.contact.contactInfo.phone || undefined}
        address={config.contact.contactInfo.address || undefined}
      />
      <section className="border-b bg-background">
        <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">
              QUANTUS / CONTACT
            </p>
            <h1 className="mt-4 max-w-xl font-semibold text-4xl leading-tight tracking-tight sm:text-5xl">
              Let’s point you in the right direction.
            </h1>
            <p className="mt-5 max-w-xl text-muted-foreground text-base leading-7">
              A product question, an account issue or an idea to share. Choose
              the topic that best fits and tell us how we can help.
            </p>
          </div>
          <div className="self-center rounded-2xl border bg-card p-7">
            <Mail
              className="text-[hsl(var(--primary))] dark:text-lime-200"
              size={24}
              aria-hidden="true"
            />
            <p className="mt-4 text-muted-foreground text-xs uppercase tracking-widest">
              {email ? "DIRECT EMAIL" : "HELP & GUIDANCE"}
            </p>
            <a
              href={email ? `mailto:${email}` : "/faq"}
              className="mt-2 inline-flex break-all items-center gap-3 font-medium text-xl"
            >
              {email || "Explore the help center"}
              <ArrowUpRight size={18} className="shrink-0" aria-hidden="true" />
            </a>
            <p className="mt-4 text-muted-foreground text-sm leading-6">
              {email
                ? "Prefer to write directly? Include the page you were using and a short description of your question."
                : "Find answers about jobs, business profiles, procurement and your account."}
            </p>
          </div>
        </div>
      </section>
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <h2 className="font-semibold text-2xl">What can we help with?</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {routes.map((route) => (
            <a
              key={route.subject}
              href={
                email
                  ? `mailto:${email}?subject=${encodeURIComponent(route.subject)}`
                  : "/faq"
              }
              className="group flex flex-col rounded-2xl border bg-card p-6 hover:border-primary/50"
            >
              <route.icon
                size={25}
                className="text-[hsl(var(--primary))] dark:text-lime-200"
                aria-hidden="true"
              />
              <h3 className="mt-5 font-semibold text-lg">{route.title}</h3>
              <p className="mb-6 mt-3 text-muted-foreground text-sm leading-6">
                {route.description}
              </p>
              <span className="mt-auto inline-flex items-center gap-2 font-medium text-sm">
                {email ? "Email us" : "Read the FAQs"}
                <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-7">
            <h2 className="font-semibold text-lg">A little context helps</h2>
            <p className="mt-3 text-muted-foreground text-sm leading-6">
              To make your message easier to understand, include:
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "The page or listing URL you were viewing",
                "What you expected and what happened instead",
                "A screenshot with personal information hidden",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0 text-[hsl(var(--primary))] dark:text-lime-200"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t pt-4 text-muted-foreground text-xs leading-6">
              Do not send passwords, authentication codes or confidential bid
              documents by email.
            </p>
          </section>
          <section className="rounded-2xl border bg-[var(--brand-panel)] p-7 text-white">
            <CircleHelp
              size={25}
              className="text-[#b3e4d7]"
              aria-hidden="true"
            />
            <h2 className="mt-5 font-semibold text-xl">
              Looking for a quick answer?
            </h2>
            <p className="mt-3 text-[var(--brand-soft-text)] text-sm leading-7">
              Explore the help pages for common questions, or read our policies
              before getting in touch.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="rounded-lg bg-[#b3e4d7] px-4 py-2.5 font-medium text-[var(--brand-ink)] text-sm"
                href="/faq"
              >
                Browse FAQs
              </Link>
              <Link
                className="rounded-lg border border-white/30 px-4 py-2.5 text-sm"
                href="/privacy"
              >
                Privacy & cookies
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
