import { describe, expect, it, vi } from 'vitest';

// The real `auth()` from auth.ts is a NextAuth HOF that reads the session
// cookie and sets req.auth before calling the wrapped callback - that
// machinery is NextAuth's own tested code, not ours. Mocking it as an
// identity function isolates exactly the logic middleware.ts is
// responsible for: what happens given req.auth is (or isn't) set.
vi.mock('@/auth', () => ({
  auth: (handler: unknown) => handler,
}));

type MiddlewareHandler = (req: {
  auth: unknown;
  nextUrl: URL;
}) => Response | undefined;

const middleware = (await import('@/middleware'))
  .default as unknown as MiddlewareHandler;

describe('jobs auth gate middleware', () => {
  it('redirects an unauthenticated request to sign-in with a callbackUrl', () => {
    const nextUrl = new URL(
      'https://example.com/jobs/type/engineering?remote=true'
    );

    const response = middleware({ auth: null, nextUrl });

    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBeGreaterThanOrEqual(300);
    expect(response?.status).toBeLessThan(400);

    const location = new URL(response?.headers.get('location') ?? '');
    expect(location.pathname).toBe('/account/sign-in');
    expect(location.searchParams.get('callbackUrl')).toBe(
      '/jobs/type/engineering?remote=true'
    );
  });

  it('redirects for the bare /jobs path too, not just sub-paths', () => {
    const nextUrl = new URL('https://example.com/jobs');

    const response = middleware({ auth: null, nextUrl });

    const location = new URL(response?.headers.get('location') ?? '');
    expect(location.searchParams.get('callbackUrl')).toBe('/jobs');
  });

  it('lets an authenticated request through without redirecting', () => {
    const nextUrl = new URL('https://example.com/jobs/type/engineering');

    const response = middleware({
      auth: { user: { id: 'seeker_1', role: 'seeker' } },
      nextUrl,
    });

    expect(response).toBeUndefined();
  });

  it('redirects regardless of which account role is missing a session', () => {
    // The gate only checks for the presence of a session, not its role -
    // there's nothing seeker-specific about /jobs access.
    const nextUrl = new URL('https://example.com/jobs/languages');

    const response = middleware({ auth: null, nextUrl });

    expect(response).toBeInstanceOf(Response);
  });
});
