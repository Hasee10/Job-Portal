import {
  ArrowRight,
  ArrowUpRight,
  HelpCircle,
  type LucideIcon,
  Mail,
  MessageSquare,
  Phone,
  Rss,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import config from '@/config';
import { resolveColor } from '@/lib/utils/colors';

type SupportChannelCardProps = {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  icon: string;
};

// Map of icon names to components
const iconMap: Record<string, LucideIcon> = {
  Mail,
  HelpCircle,
  Phone,
  MessageSquare,
  Rss,
};

// Brand/logo marks aren't part of lucide-react (dropped from the icon set
// upstream) - rendered from the same static SVG assets footer.tsx already
// uses for these platforms instead.
const BRAND_ICON_SRC: Record<string, string> = {
  Twitter: '/assets/social/twitter.svg',
  Github: '/assets/social/github.svg',
  Linkedin: '/assets/social/linkedin.svg',
};

export function SupportChannelCard({
  title,
  description,
  buttonText,
  buttonLink,
  icon,
}: SupportChannelCardProps) {
  const brandIconSrc = BRAND_ICON_SRC[icon];

  // Get the icon component or use HelpCircle as fallback. Only rendered when
  // brandIconSrc is unset (see JSX below), so this is never actually used
  // for a brand icon, but keeping it non-nullable keeps the type honest.
  const IconComponent = iconMap[icon] || HelpCircle;

  const isExternalLink =
    buttonLink.startsWith('http') || buttonLink.startsWith('mailto');

  return (
    <div className="flex h-full flex-col rounded-lg border p-5 transition-all hover:border-gray-400">
      <div className="space-y-3 pb-2">
        <div>
          {brandIconSrc ? (
            <div className="relative h-5 w-5">
              <Image
                alt={`${icon} logo`}
                className="object-contain"
                height={20}
                src={brandIconSrc}
                width={20}
              />
            </div>
          ) : (
            <IconComponent className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
          )}
        </div>
        <h3 className="font-medium text-base text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>
      <div className="flex-grow pb-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto pt-0">
        <Button
          asChild
          className="w-full gap-1.5 text-xs"
          size="xs"
          style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
          variant="primary"
        >
          <Link
            href={buttonLink}
            rel={isExternalLink ? 'noopener noreferrer' : undefined}
            target={isExternalLink ? '_blank' : undefined}
          >
            {buttonText}
            {isExternalLink && (
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {!isExternalLink && (
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </Link>
        </Button>
      </div>
    </div>
  );
}
