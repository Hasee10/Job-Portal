'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { TenderFacets } from '@/lib/procurement/scraped-tender-actions';

const SOURCE_LABELS: Record<string, string> = {
  ted: 'TED (EU)',
  ppra: 'PPRA (Pakistan)',
};

const COUNTRY_PREVIEW_COUNT = 8;

function FilterRow({
  id,
  label,
  count,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Checkbox checked={checked} id={id} onCheckedChange={(v) => onCheckedChange(v === true)} />
        <Label className="cursor-pointer font-normal text-sm" htmlFor={id}>
          {label}
        </Label>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          checked
            ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
        }`}
      >
        {count.toLocaleString()}
      </span>
    </div>
  );
}

export function TenderFiltersSidebar({ facets }: { facets: TenderFacets }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAllCountries, setShowAllCountries] = useState(false);

  const selectedCategories = new Set((searchParams.get('category') ?? '').split(',').filter(Boolean));
  const selectedSources = new Set((searchParams.get('source') ?? '').split(',').filter(Boolean));
  const selectedCountries = new Set((searchParams.get('country') ?? '').split(',').filter(Boolean));

  const hasActiveFilters =
    selectedCategories.size > 0 || selectedSources.size > 0 || selectedCountries.size > 0;

  const updateParam = (key: string, values: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (values.size > 0) params.set(key, Array.from(values).join(','));
    else params.delete(key);
    params.delete('page');
    router.push(`/procurement/tenders?${params.toString()}`);
  };

  const toggle = (key: 'category' | 'source' | 'country', set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    updateParam(key, next);
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('category');
    params.delete('source');
    params.delete('country');
    params.delete('page');
    router.push(`/procurement/tenders?${params.toString()}`);
  };

  const visibleCountries = showAllCountries
    ? facets.countries
    : facets.countries.slice(0, COUNTRY_PREVIEW_COUNT);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Filters</span>
        {hasActiveFilters && (
          <button
            className="text-primary text-xs hover:underline"
            onClick={clearAll}
            type="button"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Category</p>
        {facets.categories.map((c) => (
          <FilterRow
            checked={selectedCategories.has(c.cpvPrefix)}
            count={c.count}
            id={`category-${c.cpvPrefix}`}
            key={c.cpvPrefix}
            label={c.label.split(' (')[0]}
            onCheckedChange={() => toggle('category', selectedCategories, c.cpvPrefix)}
          />
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Source</p>
        {facets.sources.map((s) => (
          <FilterRow
            checked={selectedSources.has(s.source)}
            count={s.count}
            id={`source-${s.source}`}
            key={s.source}
            label={SOURCE_LABELS[s.source] ?? s.source}
            onCheckedChange={() => toggle('source', selectedSources, s.source)}
          />
        ))}
      </div>

      {facets.countries.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Country</p>
          {visibleCountries.map((c) => (
            <FilterRow
              checked={selectedCountries.has(c.code)}
              count={c.count}
              id={`country-${c.code}`}
              key={c.code}
              label={c.code}
              onCheckedChange={() => toggle('country', selectedCountries, c.code)}
            />
          ))}
          {facets.countries.length > COUNTRY_PREVIEW_COUNT && !showAllCountries && (
            <button
              className="text-primary text-xs hover:underline"
              onClick={() => setShowAllCountries(true)}
              type="button"
            >
              Show {facets.countries.length - COUNTRY_PREVIEW_COUNT} more countries
            </button>
          )}
        </div>
      )}
    </div>
  );
}
