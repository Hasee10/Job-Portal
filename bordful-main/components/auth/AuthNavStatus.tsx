'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

type AuthNavStatusProps = {
  className?: string;
  onNavigate?: () => void;
};

export function AuthNavStatus({
  className = '',
  onNavigate,
}: AuthNavStatusProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (session?.user) {
    const accountHref =
      session.user.role === 'seeker' ? '/account' : '/dashboard';
    return (
      <div className={`flex items-center gap-3 text-sm ${className}`}>
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
          {session.user.name || session.user.email}
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
        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        href="/account/sign-in"
        onClick={onNavigate}
      >
        Sign up
      </Link>
    </div>
  );
}
