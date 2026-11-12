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

export default function SignUpPage() {
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
        <SignUpForm />
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link className="underline hover:no-underline" href="/sign-in">
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
