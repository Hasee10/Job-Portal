'use client';

import {
  Briefcase,
  BriefcaseBusiness,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AuthNavStatus } from '@/components/auth/AuthNavStatus';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import config from '@/config';
import { resolveColor } from '@/lib/utils/colors';

// Brand icon component that uses the configured icon name or falls back to BriefcaseBusiness
function BrandIcon() {
  // We're intentionally using a simple approach for the brand icon
  // Most users will use a custom logo, so this is just a fallback
  return <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />;
}

// Reusable component interfaces
type NavLinkProps = {
  href: string;
  isActive: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
};

type SocialLinkProps = {
  href: string;
  label: string;
  children: ReactNode;
};

type SocialIconProps = {
  src: string;
  alt: string;
};

type DropdownItemProps = {
  href: string;
  isActive: boolean;
  onClick?: () => void;
  children: ReactNode;
};

// Reusable navigation link component
function NavLink({
  href,
  isActive,
  onClick,
  children,
  className = '',
}: NavLinkProps) {
  const baseClasses = 'text-sm px-2.5 py-1 rounded-lg transition-colors';
  const activeClasses = 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800';
  const inactiveClasses = 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800';

  const linkClasses = `${baseClasses} ${
    isActive ? activeClasses : inactiveClasses
  } ${className}`;

  return (
    <Link className={linkClasses} href={href} onClick={onClick}>
      {children}
    </Link>
  );
}

// Reusable social icon link component
function SocialLink({ href, label, children }: SocialLinkProps) {
  return (
    <Link
      aria-label={label}
      className="text-zinc-600 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </Link>
  );
}

// Reusable social icon component with hover effect
function SocialIcon({ src, alt }: SocialIconProps) {
  return (
    <div className="group relative">
      {/* Default state (zinc-600) */}
      <Image
        alt={alt}
        className="transition-opacity group-hover:opacity-0"
        height={16}
        src={src}
        style={{
          width: '16px',
          height: '16px',
          filter:
            'invert(41%) sepia(9%) saturate(380%) hue-rotate(202deg) brightness(94%) contrast(91%)', // zinc-600
        }}
        width={16}
      />

      {/* Hover state (zinc-900) - positioned absolutely on top */}
      <Image
        alt=""
        aria-hidden="true"
        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        height={16}
        src={src}
        style={{
          width: '16px',
          height: '16px',
          filter:
            'invert(14%) sepia(8%) saturate(427%) hue-rotate(202deg) brightness(93%) contrast(90%)', // zinc-900
        }}
        width={16}
      />
    </div>
  );
}

// Dropdown menu item component
function DropdownItem({
  href,
  isActive,
  onClick,
  children,
}: DropdownItemProps) {
  const baseClasses = 'block px-4 py-2 text-sm';
  const activeClasses = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100';
  const inactiveClasses = 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100';

  const itemClasses = `${baseClasses} ${
    isActive ? activeClasses : inactiveClasses
  }`;

  return (
    <Link className={itemClasses} href={href} onClick={onClick} role="menuitem">
      {children}
    </Link>
  );
}

// Use a consistent type for social platform configuration
type SocialPlatformConfig = {
  id: string;
  configProp: string;
  src: string;
  alt: string;
  labelPrefix: string;
  enabled: (config: typeof import('@/config').default) => boolean;
  getUrl: (config?: typeof import('@/config').default) => string;
};

// Define social platforms with their properties outside of component for reuse
const SOCIAL_PLATFORMS: SocialPlatformConfig[] = [
  {
    id: 'rss',
    configProp: 'rssFeed',
    src: '/assets/social/rss.svg',
    alt: 'RSS Feed',
    labelPrefix: 'Subscribe to',
    enabled: () => false,
    getUrl: () => '/feed.xml',
  },
  {
    id: 'github',
    configProp: 'github',
    src: '/assets/social/github.svg',
    alt: 'GitHub',
    labelPrefix: 'View on',
    enabled: (config) => config.nav.github?.show,
    getUrl: (config) => config?.nav.github?.url || '',
  },
  {
    id: 'linkedin',
    configProp: 'linkedin',
    src: '/assets/social/linkedin.svg',
    alt: 'LinkedIn',
    labelPrefix: 'Follow us on',
    enabled: (config) => config.nav.linkedin?.show,
    getUrl: (config) => config?.nav.linkedin?.url || '',
  },
  {
    id: 'twitter',
    configProp: 'twitter',
    src: '/assets/social/twitter.svg',
    alt: 'Twitter',
    labelPrefix: 'Follow us on X (',
    enabled: (config) => config.nav.twitter?.show,
    getUrl: (config) => config?.nav.twitter?.url || '',
  },
  {
    id: 'bluesky',
    configProp: 'bluesky',
    src: '/assets/social/bluesky.svg',
    alt: 'Bluesky',
    labelPrefix: 'Follow us on',
    enabled: (config) => config.nav.bluesky?.show,
    getUrl: (config) => config?.nav.bluesky?.url || '',
  },
  {
    id: 'reddit',
    configProp: 'reddit',
    src: '/assets/social/reddit.svg',
    alt: 'Reddit',
    labelPrefix: 'Follow us on',
    enabled: (config) => config.nav.reddit?.show,
    getUrl: (config) => config?.nav.reddit?.url || '',
  },
];

// Custom hook for dropdown management
//
// Click-only by design (no hover-to-open): a real mouse click always fires a
// hover/mouseenter first, so a hover-opens + click-toggles combination opens
// then immediately closes again on every click - a self-canceling race that
// made the dropdown look permanently broken. Click-to-toggle plus
// click-outside-to-close is unambiguous and works identically for mouse,
// touch, and keyboard activation.
function useDropdownMenu() {
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {}
  );
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dropdownRefSetters = useRef<
    Record<string, (el: HTMLDivElement | null) => void>
  >({});

  // Register dropdown refs for click outside detection. Returns a ref
  // callback stable across renders (cached per label) so React doesn't
  // needlessly null-then-reattach the ref on every re-render of Nav.
  const registerDropdownRef = useCallback((label: string) => {
    if (!dropdownRefSetters.current[label]) {
      dropdownRefSetters.current[label] = (el: HTMLDivElement | null) => {
        dropdownRefs.current[label] = el;
      };
    }
    return dropdownRefSetters.current[label];
  }, []);

  // Toggle dropdown open/closed
  const toggleDropdown = useCallback((label: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      Object.entries(dropdownRefs.current).forEach(([label, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdowns((prev) => ({
            ...prev,
            [label]: false,
          }));
        }
      });
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return {
    openDropdowns,
    registerDropdownRef,
    toggleDropdown,
  };
}

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Swap to the white-stroke logo variant in dark mode - the default
  // black-stroke logo.src is invisible against a dark background. Waits
  // for mount (same reasoning as ThemeToggle) since the real theme isn't
  // knowable until after hydration; renders the light-mode logo until then
  // to match the server-rendered default.
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const logoSrc =
    mounted && resolvedTheme === 'dark' && config.nav.logoDark
      ? config.nav.logoDark
      : config.nav.logo.src;

  // Use our custom hook for dropdown functionality
  const { openDropdowns, registerDropdownRef, toggleDropdown } =
    useDropdownMenu();

  // Use menu items directly from config
  const menuItems = config.nav.menu || [];

  // Check if a path is active (exact match or starts with for /jobs)
  const isActivePath = (path: string): boolean => {
    if (path === '/jobs') {
      return pathname.startsWith(path);
    }
    return pathname === path;
  };

  // Render social media links
  const renderSocialLinks = () => {
    return (
      <div className="flex items-center space-x-3">
        {/* Social Media Links */}
        {SOCIAL_PLATFORMS.map((platform) => {
          // Check if this platform is enabled in the configuration
          if (!platform.enabled(config)) {
            return null;
          }

          const label =
            platform.labelPrefix +
            (platform.id === 'twitter' ? 'Twitter)' : ` ${platform.alt}`);

          return (
            <SocialLink
              href={platform.getUrl(config)}
              key={platform.id}
              label={label}
            >
              <SocialIcon alt={platform.alt} src={platform.src} />
            </SocialLink>
          );
        })}
      </div>
    );
  };

  // Unified function to render navigation items for both mobile and desktop
  const renderNavItems = (isMobile: boolean) => {
    return menuItems.map((item) => {
      // Handle dropdown menu items
      if (item.dropdown && item.items) {
        const isDropdownOpen = openDropdowns[item.label] ?? false;

        if (isMobile) {
          return (
            <div className="mb-1" key={item.link}>
              <NavLink
                className="mb-1 block"
                href={item.link}
                isActive={pathname === item.link}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </NavLink>
              <div className="mt-1 border-zinc-200 border-l pl-4">
                {item.items.map((subItem) => (
                  <NavLink
                    className="mb-1 block"
                    href={subItem.link}
                    isActive={pathname === subItem.link}
                    key={subItem.link}
                    onClick={() => setIsOpen(false)}
                  >
                    {subItem.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        }

        // Desktop dropdown
        return (
          <div
            className="relative"
            key={item.link}
            ref={registerDropdownRef(item.label)}
          >
            <button
              aria-expanded={isDropdownOpen}
              className={`flex items-center rounded-lg px-2.5 py-1 text-sm ${
                pathname.startsWith(item.link)
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              } transition-colors`}
              onClick={() => toggleDropdown(item.label)}
            >
              {item.label}
              <ChevronDown aria-hidden="true" className="ml-1 h-3 w-3" />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 z-50 mt-1 w-40 rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white/10">
                <div aria-orientation="vertical" className="py-1" role="menu">
                  {item.items.map((subItem) => (
                    <DropdownItem
                      href={subItem.link}
                      isActive={pathname === subItem.link}
                      key={subItem.link}
                      onClick={() => toggleDropdown(item.label)}
                    >
                      {subItem.label}
                    </DropdownItem>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      // Regular menu items
      return (
        <NavLink
          className={isMobile ? 'mb-1 block' : ''}
          href={item.link}
          isActive={isActivePath(item.link)}
          key={item.link}
          onClick={() => isMobile && setIsOpen(false)}
        >
          {item.label}
        </NavLink>
      );
    });
  };

  // Create specialized renderers for desktop and mobile
  const renderDesktopNavItems = () => renderNavItems(false);
  const renderMobileNavItems = () => renderNavItems(true);

  return (
    <header className="relative z-40 border-border border-b bg-background">
      <div className="container mx-auto px-4">
        <nav
          aria-label="Main navigation"
          className="flex h-14 items-center justify-between"
        >
          {/* Brand */}
          <Link
            aria-label="Home"
            className="flex items-center space-x-1.5 text-zinc-900 dark:text-zinc-100 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
            href="/"
          >
            {config.nav.logo.enabled ? (
              <Image
                alt={config.nav.logo.alt}
                className="object-contain"
                height={config.nav.logo.height}
                key={logoSrc}
                priority
                src={logoSrc}
                style={{
                  width: `${config.nav.logo.width}px`,
                  height: `${config.nav.logo.height}px`,
                }}
                width={config.nav.logo.width}
              />
            ) : (
              <>
                <BrandIcon />
                <span className="font-medium text-sm">{config.nav.title}</span>
              </>
            )}
          </Link>

          {/* Mobile Actions */}
          <div className="flex items-center space-x-2 lg:hidden">
            {/* Mobile Post Job Button - Smaller version */}
            {config.nav.postJob.show && (
              <Button
                asChild
                className="gap-1 px-2 py-1 text-xs"
                size="xs"
                style={
                  config.nav.postJob.variant === 'primary'
                    ? {
                        backgroundColor: resolveColor(config.ui.primaryColor),
                      }
                    : undefined
                }
                variant={config.nav.postJob.variant || 'default'}
              >
                <Link
                  href={config.nav.postJob.link}
                  {...(config.nav.postJob.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {config.nav.postJob.label}
                  <Briefcase aria-hidden="true" className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}

            <ThemeToggle />

            {/* Mobile menu button */}
            <button
              aria-expanded={isOpen}
              aria-label="Toggle menu"
              className="p-2 text-zinc-600 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Menu aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden items-center lg:flex">
            {/* Primary Navigation */}
            <nav
              aria-label="Primary"
              className="mr-4 flex items-center space-x-2 whitespace-nowrap"
            >
              {renderDesktopNavItems()}
            </nav>

            {/* Social links and post job */}
            <div className="flex items-center whitespace-nowrap">
              {renderSocialLinks()}

              <ThemeToggle />

              <AuthNavStatus className="ml-4" variant="desktop" />

              {config.nav.postJob.show && (
                <Button
                  asChild
                  className="ml-5 gap-1.5 whitespace-nowrap text-xs"
                  size="xs"
                  style={
                    config.nav.postJob.variant === 'primary'
                      ? {
                          backgroundColor: resolveColor(config.ui.primaryColor),
                        }
                      : undefined
                  }
                  variant={config.nav.postJob.variant || 'default'}
                >
                  <Link
                    href={config.nav.postJob.link}
                    {...(config.nav.postJob.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {config.nav.postJob.label}
                    <Briefcase
                      aria-hidden="true"
                      className="ml-1 h-3.5 w-3.5"
                    />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </nav>

        {isOpen && (
          <div className="border-zinc-200 border-t lg:hidden">
            <nav
              aria-label="Mobile navigation"
              className="flex flex-col px-4 py-4"
            >
              {/* Primary Navigation */}
              {renderMobileNavItems()}

              {/* Social Links */}
              <div className="mt-2 flex items-center space-x-3 border-zinc-200 border-t px-4 py-4">
                {renderSocialLinks()}
                <ThemeToggle />
              </div>

              {/* Auth status (sign in/up or account) */}
              <div className="flex items-center justify-center px-4 pb-2">
                <AuthNavStatus onNavigate={() => setIsOpen(false)} />
              </div>

              {/* Post Job Action */}
              {config.nav.postJob.show && (
                <div className="px-4 pt-2 lg:hidden">
                  <Button
                    asChild
                    className={'w-full gap-1.5 text-xs'}
                    size="xs"
                    style={
                      config.nav.postJob.variant === 'primary'
                        ? {
                            backgroundColor: resolveColor(
                              config.ui.primaryColor
                            ),
                          }
                        : undefined
                    }
                    variant={config.nav.postJob.variant || 'default'}
                  >
                    <Link
                      href={config.nav.postJob.link}
                      {...(config.nav.postJob.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="flex items-center justify-center"
                      onClick={() => setIsOpen(false)}
                    >
                      {config.nav.postJob.label}
                      <Briefcase
                        aria-hidden="true"
                        className="ml-1 h-3.5 w-3.5"
                      />
                    </Link>
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
