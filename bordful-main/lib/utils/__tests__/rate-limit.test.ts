import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_WINDOW_MS } from '@/lib/constants/defaults';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to maxRequests calls for a key, then blocks the next one', () => {
    const isRateLimited = createRateLimiter(3);
    const key = '203.0.113.1';

    expect(isRateLimited(key)).toBe(false); // 1st
    expect(isRateLimited(key)).toBe(false); // 2nd
    expect(isRateLimited(key)).toBe(false); // 3rd
    expect(isRateLimited(key)).toBe(true); // 4th - over the limit
    expect(isRateLimited(key)).toBe(true); // stays blocked
  });

  it('tracks separate keys independently', () => {
    const isRateLimited = createRateLimiter(1);

    expect(isRateLimited('key-a')).toBe(false);
    expect(isRateLimited('key-a')).toBe(true);
    // A different key hasn't used its allowance yet.
    expect(isRateLimited('key-b')).toBe(false);
  });

  it('resets the count once the time window has passed', () => {
    const isRateLimited = createRateLimiter(1);
    const key = '203.0.113.1';

    expect(isRateLimited(key)).toBe(false);
    expect(isRateLimited(key)).toBe(true); // blocked within the window

    // Advance past the window.
    vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_WINDOW_MS + 1));

    expect(isRateLimited(key)).toBe(false); // allowed again
  });

  it('does not reset before the window has fully elapsed', () => {
    const isRateLimited = createRateLimiter(1);
    const key = '203.0.113.1';

    expect(isRateLimited(key)).toBe(false);
    vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_WINDOW_MS - 1));
    expect(isRateLimited(key)).toBe(true); // still within the window
  });
});

describe('getClientIp', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads the first address from x-forwarded-for', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' },
    });
    expect(getClientIp(request)).toBe('203.0.113.5');
  });

  it('trims whitespace around the first x-forwarded-for address', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '  203.0.113.5  , 70.41.3.18' },
    });
    expect(getClientIp(request)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'x-real-ip': '198.51.100.7' },
    });
    expect(getClientIp(request)).toBe('198.51.100.7');
  });

  it('falls back to "unknown" outside development when no headers are present', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const request = new Request('http://localhost/test');
    expect(getClientIp(request)).toBe('unknown');
  });
});
