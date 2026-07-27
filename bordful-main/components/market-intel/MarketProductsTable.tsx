'use client';

import { ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MarketProduct } from '@/lib/market-intel/products';

function formatPrice(currency: string, value: number | null): string {
  if (value === null) return '—';
  return `${currency} ${value.toLocaleString()}`;
}

function discountPercent(price: number | null, compareAtPrice: number | null): number | null {
  if (!price || !compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function MarketProductsTable({ initial }: { initial: MarketProduct[] }) {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [category, setCategory] = useState('all');

  const platforms = useMemo(
    () => [...new Set(initial.map((p) => p.platformSlug))].sort(),
    [initial]
  );
  const categories = useMemo(
    () => [...new Set(initial.map((p) => p.categorySlug).filter((c): c is string => Boolean(c)))].sort(),
    [initial]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initial.filter((p) => {
      if (platform !== 'all' && p.platformSlug !== platform) return false;
      if (category !== 'all' && p.categorySlug !== category) return false;
      if (q && !p.title.toLowerCase().includes(q) && !(p.brand ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [initial, search, platform, category]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="w-full max-w-xs rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or brand..."
          type="text"
          value={search}
        />
        <select
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          onChange={(e) => setPlatform(e.target.value)}
          value={platform}
        >
          <option value="all">All platforms</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          onChange={(e) => setCategory(e.target.value)}
          value={category}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {filtered.length} of {initial.length} products
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Platform</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Discount</th>
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((p) => {
              const discount = discountPercent(p.price, p.compareAtPrice);
              return (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-2">
                    <a
                      className="inline-flex items-center gap-1 font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      href={p.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {p.title}
                      <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0 text-zinc-400" />
                    </a>
                    {p.brand && <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.brand}</p>}
                  </td>
                  <td className="px-4 py-2 capitalize text-zinc-600 dark:text-zinc-400">{p.platformSlug}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{p.categorySlug ?? '—'}</td>
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                    {formatPrice(p.currency, p.price)}
                    {p.compareAtPrice && p.compareAtPrice !== p.price && (
                      <span className="ml-1.5 text-xs text-zinc-400 line-through">
                        {formatPrice(p.currency, p.compareAtPrice)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {discount ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        -{discount}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {p.inStock === null ? (
                      '—'
                    ) : p.inStock ? (
                      <span className="text-green-700 dark:text-green-400">In stock</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">Out of stock</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(p.lastSeenAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400" colSpan={7}>
                  No products match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
