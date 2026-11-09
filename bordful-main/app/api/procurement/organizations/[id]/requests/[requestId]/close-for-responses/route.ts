import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  closeOrganizationRequestForResponses,
  OrganizationResponseError,
} from "@/lib/procurement/organization-response-actions";
import { OrganizationRfqError } from "@/lib/procurement/organization-rfq-actions";

export const dynamic = "force-dynamic";

export async function POST(
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
    await closeOrganizationRequestForResponses(member, id, requestId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof OrganizationResponseError ||
      error instanceof OrganizationRfqError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "not_found" ? 404 : 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to close request for responses." },
      { status: 500 }
    );
  }
}
