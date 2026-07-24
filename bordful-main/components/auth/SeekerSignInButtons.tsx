'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A10.99 10.99 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.85z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a10.99 10.99 0 0 0-9.82 6.05l3.66 2.85C6.71 7.3 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"
        fill="#0A66C2"
      />
    </svg>
  );
}

export function SeekerSignInButtons() {
  const [pendingProvider, setPendingProvider] = useState<
    'google' | 'linkedin' | null
  >(null);
  const searchParams = useSearchParams();

  const handleSignIn = (provider: 'google' | 'linkedin') => {
    setPendingProvider(provider);
    const callbackUrl = searchParams.get('callbackUrl') || '/account';
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="space-y-3">
        <Button
          className="w-full gap-2"
          disabled={pendingProvider !== null}
          onClick={() => handleSignIn('google')}
          type="button"
          variant="outline"
        >
          <GoogleIcon />
          {pendingProvider === 'google'
            ? 'Redirecting...'
            : 'Continue with Google'}
        </Button>

        <Button
          className="w-full gap-2"
          disabled={pendingProvider !== null}
          onClick={() => handleSignIn('linkedin')}
          type="button"
          variant="outline"
        >
          <LinkedInIcon />
          {pendingProvider === 'linkedin'
            ? 'Redirecting...'
            : 'Continue with LinkedIn'}
        </Button>
      </div>
    </div>
  );
}
