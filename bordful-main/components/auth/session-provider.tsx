'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { ReactNode } from 'react';

// Thin client-boundary wrapper - RootLayout (a server component) can't
// import next-auth/react's SessionProvider directly, but it CAN render this
// client component and pass the server-fetched session down as a prop,
// avoiding a client-side session fetch/flash on first paint.
export function AuthSessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
