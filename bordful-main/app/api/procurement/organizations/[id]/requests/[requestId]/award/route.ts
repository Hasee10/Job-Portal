import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  awardOrganizationRequest,
  OrganizationResponseError,
} from "@/lib/procurement/organization-response-actions";
import { OrganizationRfqError } from "@/lib/procurement/organization-rfq-actions";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id, requestId } = await params;
  const body = await request.json();
  const responseId = typeof body.responseId === "string" ? body.responseId : "";
  if (!responseId) {
    return NextResponse.json(
      { error: "responseId is required." },
      { status: 400 }
    );
  }

  try {
    await awardOrganizationRequest(member, id, requestId, responseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    // assertCanIssueRfq/getOrganizationRequest throw OrganizationRfqError,
    // not OrganizationResponseError - both carry the same {message, code}
    // shape, so an unauthorized or not-found buyer gets 404/400 either way
    // instead of falling through to a generic 500.
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
      { error: "Failed to award request." },
      { status: 500 }
    );
  }
}
