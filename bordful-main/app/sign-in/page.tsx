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
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";
import config from "@/config";
import { headers } from "next/headers";
import { localPresentationEntry } from "@/lib/auth/local-presentation";

export const metadata: Metadata = {
  description: "Sign in to your business account.",
  robots: { follow: false, index: false },
  title: `Sign In | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeInternalRedirect(params.callbackUrl, "/dashboard");
  const host = (await headers()).get("host") ?? "";
  const demoEntry = localPresentationEntry(`http://${host}`, callbackUrl);
  if (demoEntry) redirect(demoEntry);
  const destination = procurementOnboardingDestination(
    await auth(),
    callbackUrl
  );
  if (destination) redirect(destination);
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1 className="font-bold text-2xl">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Business account sign in for procurement and hiring.
          </p>
        </div>
        {/* useSearchParams() (for the post-login callbackUrl) requires a
            Suspense boundary in the App Router. */}
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
        {callbackUrl === PROCUREMENT_WORKSPACE && (
          <div className="mx-auto max-w-md">
            <ExistingAccountOptions callbackUrl={callbackUrl} />
          </div>
        )}
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            className="underline hover:no-underline"
            href={existingAccountHref("/sign-up", callbackUrl)}
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
