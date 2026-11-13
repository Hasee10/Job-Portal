import { signIn } from "@/auth";
import {
  isLocalPresentationRequest,
  PRESENTATION_EMAIL,
  presentationDestination,
} from "@/lib/auth/local-presentation";

// Only the isolated presentation launcher supplies this password and endpoint.
// Issue a normal session so every procurement permission check still applies.
export async function GET(request: Request) {
  if (!isLocalPresentationRequest(request.url)) {
    return new Response(null, { status: 404 });
  }

  await signIn("credentials", {
    email: PRESENTATION_EMAIL,
    password: process.env.PRESENTATION_PASSWORD,
    redirectTo: presentationDestination(
      new URL(request.url).searchParams.get("callbackUrl")
    ),
  });
}
