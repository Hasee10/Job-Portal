import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FAQContent } from "@/components/ui/faq-content";
import { HeroSection } from "@/components/ui/hero-section";
import { ArrowUpRight, LifeBuoy } from "lucide-react";
import { slugify } from "@/lib/utils/slugify";
import config from "@/config";

// Add metadata for SEO
export const metadata: Metadata = {
  alternates: {
    canonical: "/faq",
    languages: {
      en: `${config.url}/faq`,
      "x-default": `${config.url}/faq`,
    },
  },
  description:
    config.faq?.description ||
    "Find answers to common questions about our job board and services.",
  keywords:
    config.faq?.keywords ||
    "job board FAQ, frequently asked questions, job search help, employer questions",
  openGraph: {
    description:
      config.faq?.description ||
      "Find answers to common questions about our job board and services.",
    title: `${config.faq?.title || "FAQ"} | ${config.title}`,
    type: "website",
    url: `${config.url}/faq`,
  },
  title: `${config.faq?.title || "FAQ"} | ${config.title}`,
  twitter: {
    card: "summary_large_image",
    description:
      config.faq?.description ||
      "Find answers to common questions about our job board and services.",
    title: `${config.faq?.title || "FAQ"} | ${config.title}`,
  },
};

// This page will be static
export const dynamic = "force-static";

export default function FAQPage() {
  // If FAQ is not enabled, redirect to home page
  if (!config.faq?.enabled) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="mb-4 font-bold text-2xl">FAQ Not Available</h1>
          <p className="mb-6">The FAQ page is currently not available.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <HeroSection
        badge={config.faq.badge || "FAQ"}
        description={config.faq.description}
        heroImage={config.faq.heroImage}
        title="A little help. A clear next step."
      />

      <div className="container mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[240px_1fr]">
        <aside>
          <div className="space-y-8 lg:sticky lg:top-28">
            <nav aria-label="Help topics">
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                FIND YOUR TOPIC
              </p>
              <ul className="flex flex-wrap gap-2 lg:flex-col">
                {config.faq.categories.map((category) => (
                  <li key={category.title}>
                    <a
                      href={`#${slugify(category.title)}`}
                      className="block rounded-lg border border-transparent px-3 py-3 text-sm hover:border-border hover:bg-accent"
                    >
                      {category.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="rounded-xl border bg-muted/50 p-5">
              <LifeBuoy size={24} className="text-primary" aria-hidden="true" />
              <h2 className="mt-4 font-medium">Need a hand?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tell us what you’re trying to do. We’ll point you in the right
                direction.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex items-center gap-3 text-sm font-medium text-primary"
              >
                Contact Quantus
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <FAQContent categories={config.faq.categories} />
        </div>
      </div>
    </main>
  );
}
