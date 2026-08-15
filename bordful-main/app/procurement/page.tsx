import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, FileCheck2, ShieldCheck } from 'lucide-react';
import { HeroSection } from '@/components/ui/hero-section';
import config from '@/config';

export const metadata: Metadata = {
  title: `Procurement | ${config.title}`,
  description:
    'Run RFIs, RFQs, RFPs, and full tender-grade sourcing processes — request, invite, respond, compare, and award, with a built-in audit trail.',
};

const FEATURE_POINTS = [
  { icon: ClipboardCheck, label: 'One engine, four formats' },
  { icon: ShieldCheck, label: 'Sealed bids, done properly' },
  { icon: FileCheck2, label: 'Full audit trail' },
];

export default function ProcurementLandingPage() {
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground text-sm hover:opacity-90"
            href="/procurement/requests"
          >
            Go to my requests
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border px-5 py-2.5 font-medium text-sm hover:bg-accent"
            href="/procurement/vendor"
          >
            I'm a vendor
          </Link>
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
          <Link className="text-primary underline underline-offset-4 hover:opacity-80" href="/procurement/vendors">
            Browse registered suppliers &rarr;
          </Link>
          <Link className="text-primary underline underline-offset-4 hover:opacity-80" href="/procurement/tenders">
            Browse global tenders &rarr;
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs">
          {FEATURE_POINTS.map(({ icon: Icon, label }) => (
            <span className="flex items-center gap-1.5 text-muted-foreground" key={label}>
              <Icon aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </HeroSection>
    </main>
  );
}
