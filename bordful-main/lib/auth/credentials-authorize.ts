// Only a type-level dependency on next-auth's Credentials provider (erased
// at compile time) - see the comment in lib/auth/callbacks.ts for why this
// matters: it keeps this importable in Vitest without the real next-auth
// package (which transitively needs next/server, unresolvable outside
// Next.js's own bundler).
import type CredentialsType from "next-auth/providers/credentials";
import { verifyEmployerCredentials } from "@/lib/auth/employers";
import { verifyRecruiterCredentials } from "@/lib/auth/recruiter-accounts";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

type CredentialsConfig = NonNullable<Parameters<typeof CredentialsType>[0]>;

// Brute-force guard on login attempts, independent of the sign-up limiter.
const isRateLimited = createRateLimiter(10);

export const authorizeCredentials: CredentialsConfig["authorize"] = async (
  credentials,
  request
) => {
  const email = credentials?.email;
  const password = credentials?.password;
  // `accountType` is passed by the recruiter sign-in form to distinguish
  // recruiter logins from employer logins — both use the same Credentials
  // provider, same cookie, same JWT. Defaults to 'employer' so the
  // existing employer sign-in form keeps working with no changes.
  const accountType =
    (credentials as Record<string, unknown>)?.accountType ?? "employer";
  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  if (isRateLimited(getClientIp(request as Request))) {
    throw new Error("Too many sign-in attempts. Please try again later.");
  }

  if (accountType === "recruiter") {
    const recruiter = await verifyRecruiterCredentials(email, password);
    if (!recruiter) {
      return null;
    }
    // Tag the user object so the jwt callback can set role: 'recruiter'
    return {
      // NextAuth passes extra fields through as-is on the user object
      // inside the jwt callback, so we use this as a signal.
      accountType: "recruiter",
      email: recruiter.email,
      id: recruiter.id,
      name: recruiter.name,
    };
  }

  const employer = await verifyEmployerCredentials(email, password);
  if (!employer) {
    return null;
  }

  return {
    email: employer.email,
    id: employer.id,
    name: employer.companyName || employer.email,
  };
};
