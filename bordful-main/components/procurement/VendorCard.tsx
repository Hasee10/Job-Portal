import type { VendorAccount } from '@/lib/procurement/vendor-actions';

export function VendorCard({ vendor }: { vendor: VendorAccount }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground text-lg"
        >
          {(vendor.companyName || vendor.email).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-50">
            {vendor.companyName || vendor.email}
          </h2>
          {vendor.location && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{vendor.location}</p>
          )}
        </div>
      </div>

      {vendor.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {vendor.categories.map((category) => (
            <span
              className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 font-medium text-cyan-700 text-xs dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400"
              key={category}
            >
              {category}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 border-zinc-100 border-t pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {vendor.industry && <span>{vendor.industry}</span>}
        {vendor.companySize && <span>{vendor.companySize}</span>}
        {vendor.website && (
          <a
            className="text-primary hover:underline"
            href={vendor.website}
            rel="noopener noreferrer"
            target="_blank"
          >
            Website
          </a>
        )}
      </div>
    </div>
  );
}
