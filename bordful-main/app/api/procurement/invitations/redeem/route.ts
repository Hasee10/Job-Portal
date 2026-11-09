import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { networkErrorResponse } from "@/lib/procurement/network-http";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  acceptInvitation,
  declineInvitation,
} from "@/lib/procurement/organization-invitation-actions";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

// Tighter than the other routes: this is the one endpoint where a correct
// guess grants membership, so the token is rate limited per caller as well
// as being 32 random bytes with a seven-day life.
const isRateLimited = createRateLimiter(10);

export async function POST(request: Request) {
  // Redeeming requires an existing signed-in account. Membership is granted
  // to that account, so there is no path here that creates an identity, and
  // no unverified email address is trusted for anything.
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const decline = body.decline === true;
  if (!token) {
    return NextResponse.json(
      { error: "An invitation code is required." },
      { status: 400 }
    );
  }

  try {
    if (decline) {
      const declined = await declineInvitation(member, token);
      return NextResponse.json({ declined: true, ...declined });
    }
    const joined = await acceptInvitation(member, token);
    return NextResponse.json({ joined: true, ...joined });
  } catch (error) {
    return networkErrorResponse(error, "Failed to redeem the invitation.");
  }
}
