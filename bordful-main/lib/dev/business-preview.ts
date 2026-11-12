import "server-only";
import { headers } from "next/headers";

// A separate read-only illustration, not an authenticated organization session.
export async function localBusinessPreviewHref(
  callbackUrl = "/procurement/organizations"
): Promise<string | null> {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.LOCAL_DEMO_DATA !== "true"
  )
    return null;
  const host = (await headers()).get("host");
  if (!host) return null;
  try {
    const origin = new URL(`http://${host}`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
      return null;
    const callback = new URL(callbackUrl, origin);
    if (
      callback.origin !== origin.origin ||
      !(
        callback.pathname === "/procurement/organizations" ||
        callback.pathname.startsWith("/procurement/organizations/")
      )
    )
      return null;
    return "/procurement/preview";
  } catch {
    return null;
  }
}
