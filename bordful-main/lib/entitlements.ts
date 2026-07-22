// Tier/entitlement model for seeker-facing premium features. No live
// payment provider is wired up yet - `tier` on job_seekers defaults to
// 'free' for everyone and can only be changed directly in the database
// until a checkout flow is built. This file is the single source of truth
// for what each tier is allowed, so gating logic never has magic numbers
// scattered across routes.

export type SeekerTier = 'free' | 'premium';

export const TIER_LIMITS: Record<
  SeekerTier,
  { maxSavedSearches: number; maxResumeTailorsPerMonth: number }
> = {
  free: { maxSavedSearches: 3, maxResumeTailorsPerMonth: 5 },
  premium: { maxSavedSearches: 20, maxResumeTailorsPerMonth: Number.POSITIVE_INFINITY },
};

export function getSavedSearchLimit(tier: SeekerTier): number {
  return TIER_LIMITS[tier].maxSavedSearches;
}

export function getResumeTailorLimit(tier: SeekerTier): number {
  return TIER_LIMITS[tier].maxResumeTailorsPerMonth;
}
