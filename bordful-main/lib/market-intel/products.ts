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

export type PricePoint = {
  price: number | null;
  compareAtPrice: number | null;
  inStock: boolean | null;
  recordedAt: string;
};

const PRODUCT_COLUMNS =
  'id, platform_id, category_slug, title, brand, url, image_url, currency, price, compare_at_price, in_stock, rating, rating_count, last_seen_at';

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getPlatformMap(supabase: ReturnType<typeof getAdminClient>) {
  const { data, error } = await supabase.from('market_platforms').select('id, slug, name');
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p]));
}

function mapProductRow(
  row: Record<string, unknown>,
  platformById: Map<string, { slug: string; name: string }>
): MarketProduct {
  const platform = platformById.get(row.platform_id as string);
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
      .select(PRODUCT_COLUMNS)
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

  const [platformById, products] = await Promise.all([
    getPlatformMap(supabase),
    fetchAllProducts(supabase),
  ]);

  return (products ?? []).map((row) => mapProductRow(row, platformById));
}

export async function getProductById(id: string): Promise<MarketProduct | null> {
  const supabase = getAdminClient();

  const [platformById, { data: row, error }] = await Promise.all([
    getPlatformMap(supabase),
    supabase.from('market_products').select(PRODUCT_COLUMNS).eq('id', id).maybeSingle(),
  ]);
  if (error) throw error;
  if (!row) return null;

  return mapProductRow(row, platformById);
}

export async function getPriceHistory(productId: string): Promise<PricePoint[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('market_price_history')
    .select('price, compare_at_price, in_stock, recorded_at')
    .eq('product_id', productId)
    .order('recorded_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    price: (row.price as number) ?? null,
    compareAtPrice: (row.compare_at_price as number) ?? null,
    inStock: (row.in_stock as boolean) ?? null,
    recordedAt: row.recorded_at as string,
  }));
}

// Same category, ± 30% of the reference product's price, cheapest first.
// No new scraping or schema needed - this is just a query over data we
// already collect per run.
const SIMILAR_PRICE_BAND = 0.3;
const SIMILAR_LIMIT = 8;

export async function getSimilarProducts(product: MarketProduct): Promise<MarketProduct[]> {
  if (!product.categorySlug || product.price === null) return [];

  const supabase = getAdminClient();
  const minPrice = product.price * (1 - SIMILAR_PRICE_BAND);
  const maxPrice = product.price * (1 + SIMILAR_PRICE_BAND);

  const [platformById, { data: rows, error }] = await Promise.all([
    getPlatformMap(supabase),
    supabase
      .from('market_products')
      .select(PRODUCT_COLUMNS)
      .eq('category_slug', product.categorySlug)
      .eq('is_active', true)
      .neq('id', product.id)
      .gte('price', minPrice)
      .lte('price', maxPrice)
      .order('price', { ascending: true })
      .limit(SIMILAR_LIMIT),
  ]);
  if (error) throw error;

  return (rows ?? []).map((row) => mapProductRow(row, platformById));
}
