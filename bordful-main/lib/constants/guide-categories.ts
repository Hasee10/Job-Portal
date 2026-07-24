// Deterministic color per category, not tied to any particular guide's
// content - new categories fall back to a neutral zinc badge instead of
// throwing, since career_guides.category is free text with no enum.
export const GUIDE_CATEGORY_STYLES: Record<string, string> = {
  'Job Search':
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  'Resumes & Applications':
    'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
  Interviewing:
    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  'Negotiation & Offers':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  'Career Development':
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
};

export const GUIDE_CATEGORY_FALLBACK_STYLE =
  'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';

export function getGuideCategoryStyle(category: string | null): string {
  if (!category) return GUIDE_CATEGORY_FALLBACK_STYLE;
  return GUIDE_CATEGORY_STYLES[category] ?? GUIDE_CATEGORY_FALLBACK_STYLE;
}
