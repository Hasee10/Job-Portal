import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyEmployerCredentials } from '@/lib/auth/employers';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

// Brute-force guard on login attempts, independent of the sign-up limiter.
const isRateLimited = createRateLimiter(10);

// Employer-only auth (job seekers browse anonymously - no accounts needed
// on that side). JWT session strategy: the session is a signed, encrypted
// cookie with no server-side session table to manage, which keeps this
// simple while still getting Auth.js's hardened cookie defaults (httpOnly,
// Secure in production, SameSite=Lax) and built-in CSRF protection on the
// credentials callback.
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required on Vercel/serverless: Auth.js can't otherwise verify the
  // incoming Host header is legitimate (there's no fixed origin the way a
  // traditional single-server deployment has), and rejects requests with
  // "UntrustedHost" - this is the officially documented fix for exactly
  // this deployment shape, not a security downgrade (the app's own CSP/
  // security headers in next.config.ts still constrain what's accepted).
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }

        if (isRateLimited(getClientIp(request))) {
          // Thrown errors from authorize() surface as a generic "CredentialsSignin"
          // error to the client either way - this just stops the DB lookup/bcrypt
          // compare from running on a request we're already rejecting.
          throw new Error('Too many sign-in attempts. Please try again later.');
        }

        const employer = await verifyEmployerCredentials(email, password);
        if (!employer) {
          return null;
        }

        return {
          id: employer.id,
          email: employer.email,
          name: employer.companyName || employer.email,
        };
      },
    }),
  ],
  callbacks: {
    // Carry the employer id through to the client-visible session object -
    // NextAuth's default user object only exposes name/email/image.
    async jwt({ token, user }) {
      if (user) {
        token.employerId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.employerId as string;
      }
      return session;
    },
  },
});
