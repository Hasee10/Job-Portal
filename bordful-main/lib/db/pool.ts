import 'server-only';

import { Pool } from 'pg';

// Shared CockroachDB connection pool - extracted from airtable.server.ts so
// the employer-auth module (lib/auth/employers.ts) can reuse the exact same
// pool/credential instead of opening a second connection to the same
// database. A fresh Pool per request (or per Next.js hot-reload in dev)
// would exhaust CockroachDB's connection limit - stash a singleton on
// `globalThis`, the standard workaround for Next.js dev's module-reload
// behavior recreating module-scope state on every file change.
declare global {
  // eslint-disable-next-line no-var
  var __cockroachPool: Pool | undefined;
}

export function getPool(): Pool | null {
  const connectionString = process.env.COCKROACH_DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!globalThis.__cockroachPool) {
    globalThis.__cockroachPool = new Pool({
      connectionString,
      // CockroachDB Cloud requires TLS; verify against Node's own bundled
      // root CAs (equivalent to what `certifi` provided on the Python side -
      // both are the Mozilla trusted-root list, just packaged differently).
      ssl: { rejectUnauthorized: true },
      max: 10,
    });
  }

  return globalThis.__cockroachPool;
}
