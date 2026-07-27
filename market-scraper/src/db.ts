import { config, requireDatabase } from './config.js';
import type { RawProduct } from './types.js';

const UPSERT_BATCH_SIZE = 200;

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function getPlatformId(platformSlug: string): Promise<string> {
  const res = await fetch(
    `${config.supabaseUrl}/rest/v1/market_platforms?slug=eq.${platformSlug}&select=id`,
    { headers: headers() },
  );
  if (!res.ok) {
    throw new Error(`Failed to look up platform "${platformSlug}": ${res.status} ${await res.text()}`);
  }
  const rows = (await res.json()) as Array<{ id: string }>;
  if (!rows.length) {
    throw new Error(`Unknown platform slug "${platformSlug}" - has migrations/001_create_market_tables.sql been applied?`);
  }
  return rows[0].id;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Upserts products into market_products (by platform_id + external_id) and
 * appends one row per product into market_price_history.
 */
export async function saveProducts(platformSlug: string, products: RawProduct[]): Promise<void> {
  requireDatabase();
  if (!products.length) return;

  const platformId = await getPlatformId(platformSlug);
  const now = new Date().toISOString();

  const dedupedByKey = new Map<string, RawProduct>();
  for (const p of products) {
    dedupedByKey.set(p.externalId, p);
  }
  const deduped = [...dedupedByKey.values()];

  for (const batch of chunk(deduped, UPSERT_BATCH_SIZE)) {
    const rows = batch.map((p) => ({
      platform_id: platformId,
      external_id: p.externalId,
      category_slug: p.categorySlug ?? null,
      title: p.title,
      brand: p.brand ?? null,
      url: p.url,
      image_url: p.imageUrl ?? null,
      currency: p.currency ?? 'PKR',
      price: p.price ?? null,
      compare_at_price: p.compareAtPrice ?? null,
      in_stock: p.inStock ?? null,
      rating: p.rating ?? null,
      rating_count: p.ratingCount ?? null,
      last_seen_at: now,
    }));

    const res = await fetch(`${config.supabaseUrl}/rest/v1/market_products?on_conflict=platform_id,external_id`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      throw new Error(`market_products upsert failed: ${res.status} ${await res.text()}`);
    }

    const saved = (await res.json()) as Array<{ id: string; price: number | null; compare_at_price: number | null; in_stock: boolean | null }>;
    const historyRows = saved.map((row) => ({
      product_id: row.id,
      price: row.price,
      compare_at_price: row.compare_at_price,
      in_stock: row.in_stock,
      recorded_at: now,
    }));

    const historyRes = await fetch(`${config.supabaseUrl}/rest/v1/market_price_history`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(historyRows),
    });
    if (!historyRes.ok) {
      throw new Error(`market_price_history insert failed: ${historyRes.status} ${await historyRes.text()}`);
    }
  }
}
