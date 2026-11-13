import { safeInternalRedirect } from "@/lib/utils/safe-redirect";
import type { Session } from "next-auth";
export const PROCUREMENT_WORKSPACE = "/procurement/organizations";
export function procurementOnboardingDestination(
  session: Session | null,
  callback: string | null | undefined
): string | null {
  const user = session?.user;
  return callback === PROCUREMENT_WORKSPACE &&
    user?.id &&
    ["employer", "recruiter", "seeker"].includes(user.role ?? "")
    ? PROCUREMENT_WORKSPACE
    : null;
}
export function existingAccountHref(path: string, callback: string): string {
  return `${path}?${new URLSearchParams({ callbackUrl: safeInternalRedirect(callback, PROCUREMENT_WORKSPACE) })}`;
}
