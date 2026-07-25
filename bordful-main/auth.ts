import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import LinkedIn from 'next-auth/providers/linkedin';
import config from '@/config';
import { verifyEmployerCredentials } from '@/lib/auth/employers';
import { verifyRecruiterCredentials } from '@/lib/auth/recruiter-accounts';
import { upsertJobSeeker } from '@/lib/auth/job-seekers';
import { sendEmail } from '@/lib/email/smtp';
import { renderSeekerWelcomeEmail } from '@/lib/email/templates/seeker-welcome';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

// Brute-force guard on login attempts, independent of the sign-up limiter.
const isRateLimited = createRateLimiter(10);

// Two account types share this one NextAuth instance: employers (email
// + password, via Credentials) and job seekers (Google/LinkedIn OAuth).
// They're distinguished by `token.role` in the callbacks below - job
// listings themselves stay fully anonymous/browsable either way. JWT
// session strategy: the session is a signed, encrypted cookie with no
// server-side session table to manage, which keeps this simple while
// still getting Auth.js's hardened cookie defaults (httpOnly, Secure in
// production, SameSite=Lax) and built-in CSRF protection.
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
        // `accountType` is passed by the recruiter sign-in form to distinguish
        // recruiter logins from employer logins — both use the same Credentials
        // provider, same cookie, same JWT. Defaults to 'employer' so the
        // existing employer sign-in form keeps working with no changes.
        const accountType = (credentials as Record<string, unknown>)?.accountType ?? 'employer';
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }

        if (isRateLimited(getClientIp(request))) {
          throw new Error('Too many sign-in attempts. Please try again later.');
        }

        if (accountType === 'recruiter') {
          const recruiter = await verifyRecruiterCredentials(email, password);
          if (!recruiter) return null;
          // Tag the user object so the jwt callback can set role: 'recruiter'
          return {
            id: recruiter.id,
            email: recruiter.email,
            name: recruiter.name,
            // NextAuth passes extra fields through as-is on the user object
            // inside the jwt callback, so we use this as a signal.
            accountType: 'recruiter',
          };
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
    Google,
    LinkedIn,
  ],
  callbacks: {
    // Carry the employer/seeker id through to the client-visible session
    // object - NextAuth's default user object only exposes name/email/image.
    // `account` is only present on the initial sign-in request, which is
    // exactly when we need to upsert the job_seekers row (not on every
    // subsequent request that just re-reads the JWT cookie).
    async jwt({ token, user, account }) {
      if (account?.provider === 'credentials' && user) {
        const u = user as typeof user & { accountType?: string };
        if (u.accountType === 'recruiter') {
          token.recruiterId = user.id;
          token.role = 'recruiter';
        } else {
          token.employerId = user.id;
          token.role = 'employer';
        }
      } else if (
        account &&
        (account.provider === 'google' || account.provider === 'linkedin') &&
        user?.email
      ) {
        const seeker = await upsertJobSeeker({
          email: user.email,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });
        token.seekerId = seeker.id;
        token.role = 'seeker';

        // Fire-and-catch, not fire-and-forget: awaited so it completes
        // before this serverless invocation can be frozen, but a failure
        // here (e.g. no RESEND_API_KEY configured) must never block sign-in
        // - the account already exists at this point either way.
        if (seeker.isNew) {
          try {
            const { subject, html } = renderSeekerWelcomeEmail({
              name: seeker.name || seeker.email,
              onboardingUrl: `${config.url}/account/onboarding`,
            });
            await sendEmail({ to: seeker.email, subject, html });
          } catch (error) {
            console.error('[auth] seeker welcome email failed', error);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.role === 'seeker') {
          session.user.id = token.seekerId as string;
        } else if (token.role === 'recruiter') {
          session.user.id = token.recruiterId as string;
        } else {
          session.user.id = token.employerId as string;
        }
        session.user.role = token.role as 'employer' | 'seeker' | 'recruiter' | undefined;
      }
      return session;
    },
  },
});
