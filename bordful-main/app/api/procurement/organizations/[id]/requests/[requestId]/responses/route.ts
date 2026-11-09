import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  listOrganizationResponsesForRequest,
  OrganizationResponseError,
} from "@/lib/procurement/organization-response-actions";

export const dynamic = "force-dynamic";

// Buyer-side view only: [id] must be the request's own organization. A
// supplier's own submission is read through the opportunities endpoint
// instead, which is invitation-scoped rather than ownership-scoped.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id, requestId } = await params;
  try {
    const view = await listOrganizationResponsesForRequest(
      member,
      id,
      requestId
    );
    return NextResponse.json(view);
  } catch (error) {
    if (error instanceof OrganizationResponseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "not_found" ? 404 : 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
