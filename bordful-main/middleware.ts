import { auth } from '@/auth';

// Job listings used to be intentionally anonymous/browsable (see auth.ts) -
// this reverses that: nothing under /jobs is reachable without a session,
// whether someone lands there from the nav, a shared link, or a search
// engine crawler.
export default auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL('/account/sign-in', req.nextUrl.origin);
    signInUrl.searchParams.set(
      'callbackUrl',
      req.nextUrl.pathname + req.nextUrl.search
    );
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ['/jobs/:path*'],
};
