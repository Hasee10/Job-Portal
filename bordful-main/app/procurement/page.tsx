import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, FileCheck2, ShieldCheck } from 'lucide-react';
import config from '@/config';

export const metadata: Metadata = {
  title: `Procurement | ${config.title}`,
  description:
    'Run RFIs, RFQs, RFPs, and full tender-grade sourcing processes — request, invite, respond, compare, and award, with a built-in audit trail.',
};

export default function ProcurementLandingPage() {
  return (
    <main className="bg-background">
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="font-semibold text-primary text-xs uppercase tracking-wider">Procurement</p>
          <h1 className="mx-auto mt-2 max-w-2xl font-bold text-3xl text-zinc-900 tracking-tight sm:text-4xl dark:text-zinc-50">
            Source vendors the way real procurement teams do
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-sm sm:text-base">
            One engine for RFIs, RFQs, RFPs, and full tender-grade sourcing — invite vendors,
            collect sealed bids, evaluate side by side, and award, with every step logged to an
            audit trail.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
        </div>
      </div>

      <div className="container mx-auto px-4 py-14">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
            </span>
            <h3 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-50">
              One engine, four formats
            </h3>
            <p className="mt-1.5 text-muted-foreground text-sm">
              RFI, RFQ, RFP, and Tender are the same request-invite-respond-award pipeline, just
              configured differently — no separate tools to learn.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            </span>
            <h3 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-50">
              Sealed bids, done properly
            </h3>
            <p className="mt-1.5 text-muted-foreground text-sm">
              Sealed bids stay hidden from you too until you deliberately open them after the
              deadline — not just from other vendors.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileCheck2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <h3 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-50">
              Full audit trail
            </h3>
            <p className="mt-1.5 text-muted-foreground text-sm">
              Every invite, view, submission, and decision is logged with who and when — built in
              from day one, not bolted on later.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
