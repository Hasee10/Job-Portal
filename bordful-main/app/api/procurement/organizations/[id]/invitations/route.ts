import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { networkErrorResponse } from "@/lib/procurement/network-http";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  createInvitation,
  listInvitations,
} from "@/lib/procurement/organization-invitation-actions";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter(10);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const invitations = await listInvitations(member, id);
    return NextResponse.json({ invitations });
  } catch (error) {
    return networkErrorResponse(error, "Failed to load invitations.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  try {
    // The inviter is the session's member, never a value from the body, and
    // the action checks that they manage this organization.
    const created = await createInvitation(member, id, {
      invitedEmail:
        typeof body.invitedEmail === "string" ? body.invitedEmail : null,
      role: typeof body.role === "string" ? body.role : "member",
    });
    // The raw token is in this response and nowhere else - it is not stored,
    // and no later request can retrieve it.
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return networkErrorResponse(error, "Failed to create the invitation.");
  }
}
