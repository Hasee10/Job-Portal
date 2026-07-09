import 'server-only';

import { RATE_LIMIT_WINDOW_MS } from '@/lib/constants/defaults';

type RateLimitInfo = {
  count: number;
  resetTime: number;
};

/**
 * Simple in-memory per-IP rate limiter. Same pattern as the one in
 * app/api/subscribe/route.ts, extracted so auth endpoints (sign-up,
 * sign-in) can each get their own independent limit without copy-pasting
 * the Map/window logic three times.
 *
 * In-memory means the limit is per server instance and resets on restart -
 * fine for deterring casual abuse/brute-forcing, not a substitute for a
 * distributed limiter (Redis/Upstash) if this ever needs to withstand a
 * determined, distributed attacker.
 */
export function createRateLimiter(maxRequests: number) {
  const rateLimitMap = new Map<string, RateLimitInfo>();

  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const info = rateLimitMap.get(key);

    if (!info || now > info.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return false;
    }

    info.count += 1;
    rateLimitMap.set(key, info);
    return info.count > maxRequests;
  };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    (process.env.NODE_ENV === 'development' ? '203.0.113.1' : 'unknown')
  );
}
