import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { respondToConnection } from "@/lib/procurement/connection-actions";
import { networkErrorResponse } from "@/lib/procurement/network-http";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const { decision } = body;
  if (decision !== "accepted" && decision !== "rejected") {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }

  try {
    // Which organization may answer is read from the row itself, not from
    // the request, so knowing a connection id is not enough to accept on
    // another business's behalf.
    const connection = await respondToConnection(member, id, decision);
    return NextResponse.json({ connection });
  } catch (error) {
    return networkErrorResponse(error, "Failed to update the request.");
  }
}
