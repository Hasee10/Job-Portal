import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type MarketProduct = {
  id: string;
  platformSlug: string;
  platformName: string;
  categorySlug: string | null;
  title: string;
  brand: string | null;
  url: string;
  imageUrl: string | null;
  currency: string;
  price: number | null;
  compareAtPrice: number | null;
  inStock: boolean | null;
  rating: number | null;
  ratingCount: number | null;
  lastSeenAt: string;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function listMarketProducts(): Promise<MarketProduct[]> {
  const supabase = getAdminClient();

  const [{ data: platforms, error: platformsError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase.from('market_platforms').select('id, slug, name'),
      supabase
        .from('market_products')
        .select(
          'id, platform_id, category_slug, title, brand, url, image_url, currency, price, compare_at_price, in_stock, rating, rating_count, last_seen_at'
        )
        .order('last_seen_at', { ascending: false })
        .limit(1000),
    ]);

  if (platformsError) throw platformsError;
  if (productsError) throw productsError;

  const platformById = new Map((platforms ?? []).map((p) => [p.id, p]));

  return (products ?? []).map((row) => {
    const platform = platformById.get(row.platform_id);
    return {
      id: row.id as string,
      platformSlug: (platform?.slug as string) ?? 'unknown',
      platformName: (platform?.name as string) ?? 'Unknown',
      categorySlug: (row.category_slug as string) ?? null,
      title: row.title as string,
      brand: (row.brand as string) ?? null,
      url: row.url as string,
      imageUrl: (row.image_url as string) ?? null,
      currency: row.currency as string,
      price: (row.price as number) ?? null,
      compareAtPrice: (row.compare_at_price as number) ?? null,
      inStock: (row.in_stock as boolean) ?? null,
      rating: (row.rating as number) ?? null,
      ratingCount: (row.rating_count as number) ?? null,
      lastSeenAt: row.last_seen_at as string,
    };
  });
}
