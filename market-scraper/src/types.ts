export interface RawProduct {
  externalId: string;
  categorySlug?: string;
  title: string;
  brand?: string;
  url: string;
  imageUrl?: string;
  currency?: string;
  price?: number;
  compareAtPrice?: number;
  inStock?: boolean;
  rating?: number;
  ratingCount?: number;
}

export interface SourceResult {
  platformSlug: string;
  products: RawProduct[];
}

export type SourceFn = () => Promise<SourceResult>;
