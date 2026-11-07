import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import { authJwtCallback, authSessionCallback } from "@/lib/auth/callbacks";
import { authorizeCredentials } from "@/lib/auth/credentials-authorize";

// Two account types share this one NextAuth instance: employers (email
// + password, via Credentials) and job seekers (Google/LinkedIn OAuth).
// They're distinguished by `token.role` in the callbacks below. Job
// listings were originally anonymous/browsable, but middleware.ts now
// gates all of /jobs behind a session (see that file's comment and
// commit 10f9d47) - this module itself doesn't enforce that gate. JWT
// session strategy: the session is a signed, encrypted cookie with no
// server-side session table to manage, which keeps this simple while
// still getting Auth.js's hardened cookie defaults (httpOnly, Secure in
// production, SameSite=Lax) and built-in CSRF protection.
//
// The callbacks and the Credentials provider's authorize logic live in
// lib/auth/callbacks.ts and lib/auth/credentials-authorize.ts, not inline
// here - those modules depend on next-auth only at the type level, which
// lets auth regression tests import and exercise this exact logic without
// pulling in the real next-auth package (it needs next/server, which plain
// Node/Vitest resolution can't locate the way Next.js's own bundler does).
export const { handlers, auth, signIn, signOut } = NextAuth({
  callbacks: {
    jwt: authJwtCallback,
    session: authSessionCallback,
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      authorize: authorizeCredentials,
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    }),
    Google,
    LinkedIn,
  ],
  session: { strategy: "jwt" },
  // Required on Vercel/serverless: Auth.js can't otherwise verify the
  // incoming Host header is legitimate (there's no fixed origin the way a
  // traditional single-server deployment has), and rejects requests with
  // "UntrustedHost" - this is the officially documented fix for exactly
  // this deployment shape, not a security downgrade (the app's own CSP/
  // security headers in next.config.ts still constrain what's accepted).
  trustHost: true,
});
