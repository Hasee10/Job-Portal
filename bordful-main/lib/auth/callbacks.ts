// Only a type-level dependency on next-auth (erased at compile time) - this
// module must stay importable without pulling in the real next-auth package,
// which itself imports next/server and can't be resolved outside Next.js's
// own bundler (not even by Vitest's plain Node resolution). That's what lets
// __tests__/auth.test.ts exercise this exact logic directly.
import type NextAuthType from "next-auth";
import config from "@/config";
import { upsertJobSeeker } from "@/lib/auth/job-seekers";
import { sendEmail } from "@/lib/email/smtp";
import { renderSeekerWelcomeEmail } from "@/lib/email/templates/seeker-welcome";

type AuthConfigParam = Parameters<typeof NextAuthType>[0];
// NextAuth's config param type also allows a function form (for request-time
// config) - excluded here since this app always passes a plain object.
type AuthConfig = Exclude<AuthConfigParam, (...args: never[]) => unknown>;
type AuthCallbacks = NonNullable<AuthConfig["callbacks"]>;

// Carry the employer/seeker id through to the client-visible session
// object - NextAuth's default user object only exposes name/email/image.
// `account` is only present on the initial sign-in request, which is
// exactly when we need to upsert the job_seekers row (not on every
// subsequent request that just re-reads the JWT cookie).
export const authJwtCallback: NonNullable<AuthCallbacks["jwt"]> = async ({
  token,
  user,
  account,
}) => {
  if (account?.provider === "credentials" && user) {
    const u = user as typeof user & { accountType?: string };
    if (u.accountType === "recruiter") {
      token.recruiterId = user.id;
      token.role = "recruiter";
    } else {
      token.employerId = user.id;
      token.role = "employer";
    }
  } else if (
    account &&
    (account.provider === "google" || account.provider === "linkedin") &&
    user?.email
  ) {
    const seeker = await upsertJobSeeker({
      avatarUrl: user.image ?? null,
      email: user.email,
      name: user.name ?? null,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    });
    token.seekerId = seeker.id;
    token.role = "seeker";

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
        await sendEmail({ html, subject, to: seeker.email });
      } catch (error) {
        console.error("[auth] seeker welcome email failed", error);
      }
    }
  }
  return token;
};

export const authSessionCallback: NonNullable<AuthCallbacks["session"]> =
  async ({ session, token }) => {
    if (session.user) {
      if (token.role === "seeker") {
        session.user.id = token.seekerId as string;
      } else if (token.role === "recruiter") {
        session.user.id = token.recruiterId as string;
      } else {
        session.user.id = token.employerId as string;
      }
      session.user.role = token.role as
        | "employer"
        | "seeker"
        | "recruiter"
        | undefined;
    }
    return session;
  };
