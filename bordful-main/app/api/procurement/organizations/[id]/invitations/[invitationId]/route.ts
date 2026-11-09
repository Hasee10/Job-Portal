import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { networkErrorResponse } from "@/lib/procurement/network-http";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import { revokeInvitation } from "@/lib/procurement/organization-invitation-actions";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Both ids go to the action, which scopes the update to this organization
  // - a manager of one business cannot revoke another's invitation by id.
  const { id, invitationId } = await params;
  try {
    const invitation = await revokeInvitation(member, id, invitationId);
    return NextResponse.json({ invitation });
  } catch (error) {
    return networkErrorResponse(error, "Failed to revoke the invitation.");
  }
}
