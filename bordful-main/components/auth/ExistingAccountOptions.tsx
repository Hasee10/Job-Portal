import Link from "next/link";
import {
  existingAccountHref,
  PROCUREMENT_WORKSPACE,
} from "@/lib/auth/procurement-onboarding";
export function ExistingAccountOptions({
  callbackUrl = PROCUREMENT_WORKSPACE,
}: {
  callbackUrl?: string;
}) {
  return (
    <section
      className="mt-5 space-y-3 rounded-xl border bg-muted/30 p-5"
      aria-label="Existing account sign-in options"
    >
      <h2 className="font-medium text-sm">Already use Caliber?</h2>
      <p className="text-xs leading-6 text-muted-foreground">
        Use your original sign-in method. You don’t need a second account to
        create or join a business.
      </p>
      <ul className="space-y-3 text-sm underline underline-offset-4">
        <li>
          <Link href={existingAccountHref("/sign-in", callbackUrl)}>
            Existing business user — business sign-in
          </Link>
        </li>
        <li>
          <Link href={existingAccountHref("/recruiter/sign-in", callbackUrl)}>
            Existing recruiter — recruiter sign-in
          </Link>
        </li>
        <li>
          <Link href={existingAccountHref("/account/sign-in", callbackUrl)}>
            Existing job seeker — continue with Google or LinkedIn
          </Link>
        </li>
      </ul>
    </section>
  );
}
