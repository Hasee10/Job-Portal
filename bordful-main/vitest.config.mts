import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Test-only config - does not affect the Next.js app build in any way.
//
// Aliases:
// - '@' mirrors the "@/*" -> "./*" path mapping in tsconfig.json, since
//   Vitest doesn't read tsconfig paths on its own.
// - 'server-only' stubs the bare specifier Next.js resolves internally via
//   its own bundler (there is no real "server-only" package in
//   node_modules - see test/server-only-stub.ts for why this is safe).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
      'server-only': path.resolve(import.meta.dirname, 'test/server-only-stub.ts'),
    },
  },
});
