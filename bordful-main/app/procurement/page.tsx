import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
  FileSearch,
  Gavel,
  MessageSquareText,
  ScrollText,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { HeroSection } from '@/components/ui/hero-section';
import { getTenderFacets } from '@/lib/procurement/scraped-tender-actions';
import { listVerifiedVendors } from '@/lib/procurement/vendor-actions';
import config from '@/config';

export const metadata: Metadata = {
  title: `Procurement | ${config.title}`,
  description:
    'Run RFIs, RFQs, RFPs, and full tender-grade sourcing processes — request, invite, respond, compare, and award, with a built-in audit trail.',
};

export const dynamic = 'force-dynamic';

const FEATURE_POINTS = [
  { icon: ClipboardCheck, label: 'One engine, four formats' },
  { icon: ShieldCheck, label: 'Sealed bids, done properly' },
  { icon: FileCheck2, label: 'Full audit trail' },
];

const REQUEST_TYPES = [
  {
    icon: MessageSquareText,
    name: 'RFI',
    title: 'Request for Information',
    description: 'Scope the market before you commit — gather capabilities, not prices.',
  },
  {
    icon: FileSearch,
    name: 'RFQ',
    title: 'Request for Quotation',
    description: 'Get comparable pricing fast on a well-defined spec.',
  },
  {
    icon: ScrollText,
    name: 'RFP',
    title: 'Request for Proposal',
    description: 'Invite full proposals when approach matters as much as price.',
  },
  {
    icon: Gavel,
    name: 'Tender',
    title: 'Formal Tender',
    description: 'Full compliance: sealed bids, prequalification, and an audited award.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Create your request',
    description: 'Pick a format — RFI, RFQ, RFP, or tender — and set the spec, deadline, and evaluation criteria.',
  },
  {
    step: '2',
    title: 'Invite vendors, collect bids',
    description: 'Invite Caliber-verified vendors. Sealed bids stay hidden — even from you — until the deadline closes.',
  },
  {
    step: '3',
    title: 'Evaluate and award',
    description: 'Compare responses side by side, score them, and award — every step logged to an audit trail.',
  },
];

export default async function ProcurementLandingPage() {
  const [facets, vendors] = await Promise.all([
    getTenderFacets().catch(() => null),
    listVerifiedVendors().catch(() => []),
  ]);
  const totalOpenTenders = facets?.sources.reduce((sum, s) => sum + s.count, 0) ?? null;

  return (
    <main className="bg-background">
      <HeroSection
        badge="Matchmaking for procurement"
        description="One engine for RFIs, RFQs, RFPs, and full tender-grade sourcing — invite vendors, collect sealed bids, evaluate side by side, and award, with every step logged to an audit trail."
        heroImage={{
          enabled: true,
          src: '/procurement-hero.png',
          alt: 'Caliber’s AI matching engine scoring verified vendors against a tender, with sealed bids and an audit trail',
        }}
        title="The same matchmaking engine, built for sourcing vendors"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 font-medium text-primary text-sm hover:opacity-90"
            href="/procurement/requests"
          >
            Go to my requests
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-white/40 px-5 py-2.5 font-medium text-sm text-white hover:bg-white/10"
            href="/procurement/vendor"
          >
            I'm a vendor
          </Link>
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
          <Link className="text-white underline underline-offset-4 hover:opacity-80" href="/procurement/vendors">
            Browse registered suppliers &rarr;
          </Link>
          <Link className="text-white underline underline-offset-4 hover:opacity-80" href="/procurement/tenders">
            Browse global tenders &rarr;
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-white/20 border-t pt-4 text-xs">
          {FEATURE_POINTS.map(({ icon: Icon, label }) => (
            <span className="flex items-center gap-1.5 text-white/80" key={label}>
              <Icon aria-hidden="true" className="h-3.5 w-3.5 text-white" />
              {label}
            </span>
          ))}
        </div>
      </HeroSection>

      {/* Live numbers - same "bold stats band" treatment as the homepage's
          guest stats grid, using real counts instead of placeholder copy. */}
      {(totalOpenTenders !== null || vendors.length > 0) && (
        <div className="border-b bg-muted/20 py-10">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-2xl grid-cols-2 gap-6 text-center">
              <div>
                <p className="font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-50">
                  {(totalOpenTenders ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">Open tenders worldwide</p>
              </div>
              <div>
                <p className="font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-50">
                  {vendors.length.toLocaleString()}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">Verified registered vendors</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Four request formats - the FEATURE_POINTS chips in the hero name
          "four formats" in the abstract; this is what that actually means. */}
      <div className="border-b bg-background py-14">
        <div className="container mx-auto px-4">
          <p className="text-center font-semibold text-primary text-xs uppercase tracking-wider">
            One engine, four formats
          </p>
          <h2 className="mt-2 text-center font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-50">
            Pick the format that matches how firm your spec is
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {REQUEST_TYPES.map(({ icon: Icon, name, title, description }) => (
              <div
                className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                key={name}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <p className="mt-4 font-semibold text-primary text-xs uppercase tracking-wider">{name}</p>
                <h3 className="mt-1 font-semibold text-base text-zinc-900 dark:text-zinc-50">{title}</h3>
                <p className="mt-1.5 text-muted-foreground text-sm">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works - mirrors the homepage's 3-step numbered pattern. */}
      <div className="border-b bg-muted/20 py-14">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-50">
            How it works
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-sm">
                  {step}
                </span>
                <h3 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-50">{title}</h3>
                <p className="mt-1.5 text-muted-foreground text-sm">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Built for both sides - buyers vs. vendors, mirrors the homepage's
          "Job seekers / Employers & recruiters" split. */}
      <div className="bg-background py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
              </span>
              <h3 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-50">Buyers</h3>
              <p className="mt-1.5 text-muted-foreground text-sm">
                Create a request, invite verified vendors, and award with a defensible audit trail.
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                href="/procurement/requests"
              >
                Go to my requests
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Store aria-hidden="true" className="h-4 w-4" />
              </span>
              <h3 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-50">Vendors</h3>
              <p className="mt-1.5 text-muted-foreground text-sm">
                Get invited to requests that match your category and respond directly — no cold outreach.
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                href="/procurement/vendor"
              >
                I'm a vendor
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
