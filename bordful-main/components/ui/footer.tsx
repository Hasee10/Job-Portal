"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { SITE_LINKS, siteContext } from "@/lib/ui/site-navigation";
export function Footer() {
  const context = siteContext(usePathname());
  const title =
    context === "procurement"
      ? "Build your next business relationship."
      : context === "jobs"
        ? "Make your next career move."
        : "Opportunity starts with a connection.";
  const cta =
    context === "procurement"
      ? "Explore the directory"
      : context === "jobs"
        ? "Find your next role"
        : "Choose your path";
  const href =
    context === "procurement"
      ? "/procurement/directory"
      : context === "jobs"
        ? "/jobs"
        : "/join";
  const groups = [
    {
      title:
        context === "procurement"
          ? "Procurement"
          : context === "jobs"
            ? "Careers"
            : "Explore",
      links: SITE_LINKS[context],
    },
    {
      title: "Caliber",
      links: [
        { label: "About us", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Help & FAQs", href: "/faq" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy & cookies", href: "/privacy" },
        { label: "Terms of service", href: "/terms" },
      ],
    },
  ];
  return (
    <footer className="bg-[var(--brand-panel)] text-white">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-6 border-b border-white/15 py-10 sm:flex-row sm:items-center">
          <div>
            <p className="text-[#9EDBCD] text-xs uppercase tracking-[.18em]">
              YOUR NEXT CHAPTER
            </p>
            <h2 className="mt-3 max-w-xl font-medium text-2xl tracking-tight sm:text-3xl">
              {title}
            </h2>
          </div>
          <Link
            className="inline-flex w-fit items-center gap-3 rounded-lg bg-[var(--brand-highlight)] px-5 py-3 font-semibold text-[var(--brand-ink)] text-sm hover:bg-[#D0F7EA]"
            href={href}
          >
            {cta}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-10 py-12 lg:grid-cols-[1.5fr_2fr]">
          <div>
            <Brand inverted />
            <p className="mt-5 max-w-xs text-[var(--brand-soft-text)] text-sm leading-6">
              {context === "procurement"
                ? "A clearer way to discover partners, build relationships and manage sourcing."
                : context === "jobs"
                  ? "Find relevant roles, build your confidence and take the next step in your career."
                  : "One platform for your career and your business. Move forward with Caliber."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <nav key={group.title} aria-label={`Footer ${group.title}`}>
                <h3 className="font-medium text-sm">{group.title}</h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="text-[var(--brand-soft-text)] text-sm hover:text-white hover:underline underline-offset-4"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-white/15 py-6 text-[var(--brand-soft-text)] text-xs">
          <span>
            © {new Date().getFullYear()} Caliber. All rights reserved.
          </span>
          <span>Careers. Connections. Possibilities.</span>
        </div>
      </div>
    </footer>
  );
}
