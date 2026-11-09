// Shared setup for the local HTTP integration tests. Not a .test.ts file, so
// Vitest's include pattern does not collect it as a suite.
//
// These tests talk to a real local PostgreSQL through standalone PostgREST,
// so they are skipped unless SUPABASE_URL points at loopback. That guard is
// also a safety interlock: it means they can never run against the hosted
// project, whatever is in the environment.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Vitest does not read .env.local the way the Next.js runtime does, and one
// test file is not a reason to add a dotenv dependency or change
// vitest.config.mts. Parsing KEY=VALUE is enough.
//
// readFileSync with "utf8" leaves a byte-order mark in place, and a BOM would
// make the first variable parse as "﻿SUPABASE_URL" - so SUPABASE_URL
// would look unset and every test here would silently skip rather than fail.
// supabase/local-dev-credentials.ps1 writes the file without a BOM; stripping
// one here as well keeps a hand-edited file from causing a silent skip.
const LEADING_BOM = /^﻿/;
const LINE_BREAK = /\r?\n/;
const ENV_LINE = /^([A-Z0-9_]+)=(.*)$/;
const LOOPBACK_URL = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/;

export function loadLocalEnv(): void {
  const envPath = path.resolve(import.meta.dirname, "../../../.env.local");
  if (!existsSync(envPath)) {
    return;
  }
  const text = readFileSync(envPath, "utf8").replace(LEADING_BOM, "");
  for (const line of text.split(LINE_BREAK)) {
    const match = ENV_LINE.exec(line.trim());
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

export function localTarget(): {
  anonKey: string;
  canRun: boolean;
  serviceKey: string;
  url: string;
} {
  loadLocalEnv();
  const url = process.env.SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
  const isLoopback = LOOPBACK_URL.test(url);
  return {
    anonKey,
    canRun: isLoopback && Boolean(serviceKey),
    serviceKey,
    url,
  };
}
