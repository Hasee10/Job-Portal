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

const FETCH_PAGE_SIZE = 1000;

// Supabase/PostgREST caps a single request at 1000 rows regardless of
// .limit() - a plain query silently dropped everything past the first 1000
// once total inventory across all platforms grew past that (later-scraped
// platforms, sorted last_seen_at desc, pushed earlier ones out of the
// window entirely). Page through with .range() to get everything.
async function fetchAllProducts(supabase: ReturnType<typeof getAdminClient>) {
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += FETCH_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('market_products')
      .select(
        'id, platform_id, category_slug, title, brand, url, image_url, currency, price, compare_at_price, in_stock, rating, rating_count, last_seen_at'
      )
      .order('last_seen_at', { ascending: false })
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < FETCH_PAGE_SIZE) break;
  }
  return rows;
}

export async function listMarketProducts(): Promise<MarketProduct[]> {
  const supabase = getAdminClient();

  const [{ data: platforms, error: platformsError }, products] = await Promise.all([
    supabase.from('market_platforms').select('id, slug, name'),
    fetchAllProducts(supabase),
  ]);

  if (platformsError) throw platformsError;

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
