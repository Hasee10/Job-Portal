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
