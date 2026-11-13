export const PRESENTATION_EMAIL = "ihaseebarshad10@gmail.com";

export function presentationDestination(
  callback: string | null | undefined
): string {
  try {
    const target = new URL(callback ?? "", "http://localhost");
    if (
      target.origin === "http://localhost" &&
      (target.pathname === "/procurement" ||
        target.pathname.startsWith("/procurement/"))
    ) {
      return `${target.pathname}${target.search}`;
    }
  } catch {
    // Invalid callbacks use the procurement dashboard.
  }
  return "/procurement/organizations";
}

export function localPresentationEntry(
  requestUrl: string,
  callback?: string | null
): string | null {
  if (!isLocalPresentationRequest(requestUrl)) return null;
  return `/demo?${new URLSearchParams({ callbackUrl: presentationDestination(callback) })}`;
}

/** The presentation launcher is the only place that supplies these settings. */
export function isLocalPresentationRequest(
  requestUrl: string,
  environment: Record<string, string | undefined> = process.env
): boolean {
  if (
    environment.NODE_ENV !== "development" ||
    !environment.PRESENTATION_PASSWORD ||
    environment.SUPABASE_URL !== "http://127.0.0.1:55432"
  ) {
    return false;
  }
  try {
    const { hostname, protocol } = new URL(requestUrl);
    return (
      ["http:", "https:"].includes(protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(hostname)
    );
  } catch {
    return false;
  }
}
