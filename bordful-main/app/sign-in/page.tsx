import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";
import config from "@/config";

export const metadata: Metadata = {
  description: "Sign in to your business account.",
  robots: { follow: false, index: false },
  title: `Sign In | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default function SignInPage() {
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
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link className="underline hover:no-underline" href="/sign-up">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
