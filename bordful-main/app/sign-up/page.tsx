import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ExistingAccountOptions } from "@/components/auth/ExistingAccountOptions";
import {
  existingAccountHref,
  procurementOnboardingDestination,
  PROCUREMENT_WORKSPACE,
} from "@/lib/auth/procurement-onboarding";
import { safeInternalRedirect } from "@/lib/utils/safe-redirect";
import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";
import config from "@/config";

export const metadata: Metadata = {
  description: "Create a business account for procurement and hiring.",
  robots: { follow: false, index: false },
  title: `Sign Up | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const callbackUrl = safeInternalRedirect(params.callbackUrl, "/dashboard");
  const destination = procurementOnboardingDestination(session, callbackUrl);
  if (destination) redirect(destination);
  if (
    session?.user?.id &&
    ["employer", "recruiter", "seeker"].includes(session.user.role ?? "")
  ) {
    redirect(
      session.user.role === "seeker"
        ? "/account"
        : session.user.role === "recruiter"
          ? "/recruiter/dashboard"
          : "/dashboard"
    );
  }
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Create a business account</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Connect with buyers and suppliers, manage procurement, or hire
            through Jobs.
          </p>
        </div>
        <div className="mx-auto max-w-md">
          {callbackUrl === PROCUREMENT_WORKSPACE && (
            <>
              <ExistingAccountOptions callbackUrl={callbackUrl} />
              <p className="my-5 text-center text-sm font-medium">
                New business user? Create a business account below.
              </p>
            </>
          )}
        </div>
        <SignUpForm callbackUrl={callbackUrl} />
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            className="underline hover:no-underline"
            href={existingAccountHref("/sign-in", callbackUrl)}
          >
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Looking for a job?{" "}
          <Link
            className="underline hover:no-underline"
            href="/account/sign-in"
          >
            Job seeker sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
