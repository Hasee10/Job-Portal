import Link from 'next/link';
import type React from 'react';
import config from '@/config';
import { cn } from '@/lib/utils';
import { resolveColor } from '@/lib/utils/colors';

export type BadgeType =
  | 'new'
  | 'remote'
  | 'onsite'
  | 'hybrid'
  | 'featured'
  | 'default'
  | 'not specified'
  | 'visa-yes'
  | 'visa-no'
  | 'visa-not-specified'
  | 'career-level'
  | 'language'
  | 'currency';

type JobBadgeProps = {
  type: BadgeType;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  href?: string; // Optional URL for clickable badges
};

export function JobBadge({
  type,
  children,
  className,
  icon,
  href,
}: JobBadgeProps) {
  // Base badge styles without hover effects
  const badgeStyles = {
    new: 'bg-green-50 border-green-100 border text-green-700 dark:bg-green-950 dark:border-green-900 dark:text-green-400',
    remote:
      'bg-green-50 border-green-100 border text-green-700 dark:bg-green-950 dark:border-green-900 dark:text-green-400',
    onsite:
      'bg-red-50 border-red-100 border text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-400',
    hybrid:
      'bg-blue-50 border-blue-100 border text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400',
    featured: 'text-zinc-50',
    default: 'bg-card border text-foreground',
    'not specified': 'bg-card border text-foreground',
    'visa-yes':
      'bg-green-50 border-green-100 border text-green-700 dark:bg-green-950 dark:border-green-900 dark:text-green-400',
    'visa-no':
      'bg-red-50 border-red-100 border text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-400',
    'visa-not-specified': 'bg-card border text-foreground',
    'career-level': 'bg-card border text-foreground',
    language: 'bg-card border text-foreground',
    currency:
      'bg-amber-50 border-amber-100 border text-amber-700 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-400',
  };

  // Apply hover effects only when href is provided (badge is clickable)
  const hoverStyles = href ? 'hover:border-gray-400 transition-colors' : '';

  const baseStyles = 'inline-block px-2 py-0.5 text-xs rounded-full';

  // Featured badges have different styling
  const featuredStyles =
    type === 'featured'
      ? 'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full'
      : baseStyles;

  const styles = cn(featuredStyles, badgeStyles[type], hoverStyles, className);

  // Apply inline style for featured badge to use primary color
  const badgeStyle =
    type === 'featured'
      ? { backgroundColor: resolveColor(config.ui.primaryColor) }
      : undefined;

  // If href is provided, render as a link
  if (href) {
    return (
      <Link
        className={cn(styles, 'cursor-pointer')}
        href={href}
        style={badgeStyle}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </Link>
    );
  }

  // Regular badge (non-clickable)
  return (
    <span className={styles} style={badgeStyle}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}
