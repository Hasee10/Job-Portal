import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { listVerifiedVendors } from '@/lib/procurement/vendor-actions';
import { VendorCard } from '@/components/procurement/VendorCard';
import config from '@/config';

export const metadata: Metadata = {
  title: `Registered Suppliers | ${config.title}`,
  description: 'Browse verified suppliers and service providers registered on Caliber.',
};

export const dynamic = 'force-dynamic';

export default async function ProcurementVendorsPage() {
  const vendors = await listVerifiedVendors();

  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-50">
            Registered suppliers
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Verified vendors and service providers on Caliber. To work with one, create a
            procurement request and invite them by email.
          </p>

          {vendors.length === 0 ? (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-zinc-200 border-dashed bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
                <Building2 aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">
                No registered suppliers yet
              </p>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                Verified recruiters and vendors will appear here as they join.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}

          <div className="mt-10 rounded-xl border border-zinc-200 bg-muted/30 p-5 text-sm dark:border-zinc-800">
            Are you a service provider?{' '}
            <Link className="font-medium text-primary hover:underline" href="/procurement/vendor">
              Sign in as a recruiter
            </Link>{' '}
            to manage the requests you're invited to.
          </div>
        </div>
      </div>
    </main>
  );
}
