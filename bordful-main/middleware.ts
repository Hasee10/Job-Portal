import { auth } from '@/auth';

// auth.ts pulls in the Credentials provider's recruiter/employer password
// verification, which uses Node's crypto module - the default Edge runtime
// can't bundle that (`node:crypto` is an unhandled scheme there), so this
// has to opt into the Node.js Middleware runtime (stable since Next.js 15.2).
export const runtime = 'nodejs';

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
