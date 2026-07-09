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
    return (
      <div className={`flex items-center gap-3 text-sm ${className}`}>
        <Link
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          href="/dashboard"
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
        href="/sign-in"
        onClick={onNavigate}
      >
        Sign in
      </Link>
      <Link
        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        href="/sign-up"
        onClick={onNavigate}
      >
        Sign up
      </Link>
    </div>
  );
}
