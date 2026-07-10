'use client';

import { Building2, MapPin, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import config from '@/config';
import type { Job } from '@/lib/db/airtable';
import { useJobSearch } from '@/lib/hooks/useJobSearch';

type Suggestion =
  | { kind: 'job'; label: string; sub: string; value: string }
  | { kind: 'company'; label: string; value: string }
  | { kind: 'location'; label: string; value: string };

function buildSuggestions(jobs: Job[], term: string): Suggestion[] {
  if (!term || term.length < 1) return [];
  const lower = term.toLowerCase();

  const titles = new Map<string, string>(); // title → company
  const companies = new Set<string>();
  const locations = new Set<string>();

  for (const job of jobs) {
    if (job.title?.toLowerCase().includes(lower)) {
      if (!titles.has(job.title)) titles.set(job.title, job.company);
    }
    if (job.company?.toLowerCase().includes(lower)) {
      companies.add(job.company);
    }
    const city = job.workplace_city;
    const country = job.workplace_country;
    if (city?.toLowerCase().includes(lower)) locations.add(city);
    if (country?.toLowerCase().includes(lower)) locations.add(country);
  }

  const results: Suggestion[] = [];
  for (const [title, company] of Array.from(titles).slice(0, 4)) {
    results.push({ kind: 'job', label: title, sub: company, value: title });
  }
  for (const company of Array.from(companies).slice(0, 3)) {
    results.push({ kind: 'company', label: company, value: company });
  }
  for (const loc of Array.from(locations).slice(0, 3)) {
    results.push({ kind: 'location', label: loc, value: loc });
  }
  return results;
}

type JobSearchInputProps = {
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  jobs?: Job[];
};

export function JobSearchInput({
  placeholder,
  className = 'pl-9 h-10',
  'aria-label': ariaLabel,
  jobs = [],
}: JobSearchInputProps) {
  const defaultPlaceholder =
    config.search?.placeholder || 'Search by role, company, or location...';
  const defaultAriaLabel = config.search?.ariaLabel || 'Search jobs';
  const finalPlaceholder = placeholder || defaultPlaceholder;
  const finalAriaLabel = ariaLabel || defaultAriaLabel;

  const { searchTerm, isSearching, handleSearch, clearSearch } = useJobSearch();
  const [inputValue, setInputValue] = useState(searchTerm || '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setInputValue(searchTerm || '');
  }, [searchTerm]);

  // Compute dropdown position anchored to the input
  const updateDropdownRect = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 6, left: r.left, width: r.width });
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        // Also check portal dropdown
        const portal = document.getElementById('search-dropdown-portal');
        if (!portal || !portal.contains(target)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Recompute position on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    updateDropdownRect();
    window.addEventListener('scroll', updateDropdownRect, true);
    window.addEventListener('resize', updateDropdownRect);
    return () => {
      window.removeEventListener('scroll', updateDropdownRect, true);
      window.removeEventListener('resize', updateDropdownRect);
    };
  }, [open]);

  const suggestions = buildSuggestions(jobs, inputValue);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setActiveIndex(-1);
    if (value.length > 0) {
      updateDropdownRect();
      setOpen(true);
    } else {
      setOpen(false);
    }
    handleSearch(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      setInputValue('');
      clearSearch();
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
  };

  const selectSuggestion = (s: Suggestion) => {
    setInputValue(s.value);
    handleSearch(s.value);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const onClear = () => {
    setInputValue('');
    clearSearch();
    setOpen(false);
    setActiveIndex(-1);
  };

  const heroSearchBgColor = config?.ui?.heroSearchBgColor || '';
  const hasSuggestions = open && suggestions.length > 0;

  const kindGroups: { kind: Suggestion['kind']; icon: React.ReactNode; label: string }[] = [
    { kind: 'job',      icon: <Search     className="h-3.5 w-3.5" />, label: 'Jobs'      },
    { kind: 'company',  icon: <Building2  className="h-3.5 w-3.5" />, label: 'Companies' },
    { kind: 'location', icon: <MapPin     className="h-3.5 w-3.5" />, label: 'Locations' },
  ];

  const dropdown = hasSuggestions && mounted && dropdownRect ? createPortal(
    <div
      id="search-dropdown-portal"
      style={{
        position: 'fixed',
        top: dropdownRect.top,
        left: dropdownRect.left,
        width: dropdownRect.width,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
    >
      {kindGroups.map(({ kind, icon, label }) => {
        const items = suggestions.filter((s) => s.kind === kind);
        if (items.length === 0) return null;
        return (
          <div key={kind}>
            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-xs font-semibold text-muted-foreground">
              {icon}
              {label}
            </div>
            {items.map((s) => {
              const globalIndex = suggestions.indexOf(s);
              const isActive = globalIndex === activeIndex;
              return (
                <button
                  key={`${kind}-${s.value}`}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                  onMouseEnter={() => setActiveIndex(globalIndex)}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                >
                  <span className="truncate font-medium">{s.label}</span>
                  {s.kind === 'job' && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{s.sub}</span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="border-t px-3 py-2">
        <button
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
          onMouseDown={(e) => { e.preventDefault(); handleSearch(inputValue); setOpen(false); }}
          type="button"
        >
          Search all results for <span className="font-semibold">"{inputValue}"</span>
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  const onSearchClick = () => {
    handleSearch(inputValue);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="flex w-full gap-2" ref={containerRef}>
      <div className="relative flex-1">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          aria-label={finalAriaLabel}
          aria-autocomplete="list"
          aria-expanded={hasSuggestions}
          className={cn(
            className,
            // When a custom (typically light) background is forced, ensure
            // text stays dark so it's visible in both light and dark themes.
            heroSearchBgColor ? 'text-zinc-900 placeholder:text-zinc-500' : ''
          )}
          onChange={onChange}
          onFocus={() => { if (inputValue.length > 0) { updateDropdownRect(); setOpen(true); } }}
          onKeyDown={onKeyDown}
          placeholder={finalPlaceholder}
          role="combobox"
          style={{ backgroundColor: heroSearchBgColor || undefined }}
          type="text"
          value={inputValue}
        />
        {inputValue && (
          <button
            aria-label="Clear search"
            className="-translate-y-1/2 absolute top-1/2 right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400 z-10"
            onMouseDown={(e) => { e.preventDefault(); onClear(); }}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isSearching && !hasSuggestions && (
          <div className="-translate-y-1/2 absolute top-1/2 right-10 z-10">
            <div className="pulse-dot h-2 w-2 rounded-full bg-blue-500 opacity-75" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onSearchClick}
        className="shrink-0 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Search
      </button>
      {dropdown}
    </div>
  );
}
