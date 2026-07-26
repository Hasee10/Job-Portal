// Validates a callbackUrl/redirect query param is an internal path before
// using it for a client-side navigation after sign-in. Guards against an
// open redirect: `/sign-in?callbackUrl=https://evil.example` (or a
// protocol-relative `//evil.example`) must never be used verbatim, even
// though today's router.push() implementation happens to no-op on a
// cross-origin push (the History API enforces same-origin) - that's an
// incidental browser restriction, not a guarantee, and the moment this
// codepath is ever changed to `window.location.href = callbackUrl` it
// becomes a fully working redirect.
export function safeInternalRedirect(
  target: string | null | undefined,
  fallback: string
): string {
  if (!target) return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  return target;
}
