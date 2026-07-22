'use client';

import { ChevronDown, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type AuthNavStatusProps = {
  className?: string;
  onNavigate?: () => void;
  // "desktop" collapses account links into a dropdown so the nav bar
  // doesn't show Resume Builder / name / Sign out as separate flat links.
  // "mobile" (default) keeps them stacked, which already reads fine in the
  // vertical mobile menu.
  variant?: 'desktop' | 'mobile';
};

export function AuthNavStatus({
  className = '',
  onNavigate,
  variant = 'mobile',
}: AuthNavStatusProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return null;
  }

  if (session?.user) {
    const accountHref =
      session.user.role === 'seeker' ? '/account' : '/dashboard';
    const displayName = session.user.name || session.user.email;

    const closeAndNavigate = () => {
      setIsOpen(false);
      onNavigate?.();
    };

    if (variant === 'desktop') {
      return (
        <div className={`flex items-center gap-3 text-sm ${className}`}>
          {session.user.role === 'seeker' && (
            <Link
              className="font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              href="/pricing"
            >
              Go Premium
            </Link>
          )}
          <div className="relative" ref={menuRef}>
            <button
              aria-expanded={isOpen}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              onClick={() => setIsOpen((prev) => !prev)}
              type="button"
            >
              <User aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{displayName}</span>
              <ChevronDown aria-hidden="true" className="h-3 w-3" />
            </button>

            {isOpen && (
              <div className="absolute right-0 z-50 mt-1 w-48 rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white/10">
                <div aria-orientation="vertical" className="py-1" role="menu">
                  {session.user.role === 'seeker' && (
                    <Link
                      className="block px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      href="/account/resume"
                      onClick={closeAndNavigate}
                      role="menuitem"
                    >
                      Resume Builder
                    </Link>
                  )}
                  <Link
                    className="block px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    href={accountHref}
                    onClick={closeAndNavigate}
                    role="menuitem"
                  >
                    My Account
                  </Link>
                  <button
                    className="block w-full px-4 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    onClick={() => {
                      closeAndNavigate();
                      signOut({ callbackUrl: '/' });
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center gap-2 text-sm ${className}`}>
        {session.user.role === 'seeker' && (
          <>
            <Link
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              href="/account/resume"
              onClick={onNavigate}
            >
              Resume Builder
            </Link>
            <Link
              className="font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              href="/pricing"
              onClick={onNavigate}
            >
              Go Premium
            </Link>
          </>
        )}
        <Link
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          href={accountHref}
          onClick={onNavigate}
        >
          {displayName}
        </Link>
        <button
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => {
            onNavigate?.();
            signOut({ callbackUrl: '/' });
          }}
          type="button"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      <Link
        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        href="/account/sign-in"
        onClick={onNavigate}
      >
        Sign in
      </Link>
      <Link
        className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        href="/account/sign-in"
        onClick={onNavigate}
      >
        Sign up
      </Link>
    </div>
  );
}
