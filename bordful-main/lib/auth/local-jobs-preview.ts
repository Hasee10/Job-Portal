// UI-only preview: never grants a session or bypasses account/API permissions.
// Production builds must enforce authentication even when served on localhost.
export function allowLocalJobsPreview(
  url: URL,
  environment: string | undefined
): boolean {
  return (
    environment === "development" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  );
}

// Only Jobs-page destinations are previewable; never forward to an external
// site or imply that account actions have acquired an authenticated session.
export function localJobsPreviewDestination(
  url: URL,
  environment: string | undefined,
  callbackUrl?: string
): string | null {
  if (!allowLocalJobsPreview(url, environment)) return null;
  if (callbackUrl) {
    try {
      const target = new URL(callbackUrl, url);
      if (
        target.origin === url.origin &&
        (target.pathname === "/jobs" || target.pathname.startsWith("/jobs/"))
      ) {
        return target.pathname + target.search + target.hash;
      }
    } catch {
      return "/jobs";
    }
  }
  return "/jobs";
}
