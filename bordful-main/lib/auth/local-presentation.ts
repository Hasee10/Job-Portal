export const PRESENTATION_EMAIL = "ihaseebarshad10@gmail.com";

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
