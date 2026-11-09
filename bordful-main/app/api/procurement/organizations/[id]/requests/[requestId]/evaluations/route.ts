import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  listOrganizationEvaluations,
  OrganizationResponseError,
  scoreOrganizationResponse,
} from "@/lib/procurement/organization-response-actions";
import { OrganizationRfqError } from "@/lib/procurement/organization-rfq-actions";

// assertCanIssueRfq/getOrganizationRequest (called before any evaluation or
// award action runs) throw OrganizationRfqError, not
// OrganizationResponseError - both carry the same {message, code} shape, so
// an unauthorized or not-found buyer gets the same 404/400 either way
// instead of falling through to a generic 500.
function toStatusResponse(error: unknown, fallback: string) {
  if (
    error instanceof OrganizationResponseError ||
    error instanceof OrganizationRfqError
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "not_found" ? 404 : 400 }
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export const dynamic = "force-dynamic";

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
    const evaluations = await listOrganizationEvaluations(
      member,
      id,
      requestId
    );
    return NextResponse.json({ evaluations });
  } catch (error) {
    return toStatusResponse(error, "Failed to load evaluations.");
  }
}

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
  const score = typeof body.score === "number" ? body.score : null;
  const notes =
    typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : null;
  if (!responseId) {
    return NextResponse.json(
      { error: "responseId is required." },
      { status: 400 }
    );
  }

  try {
    const evaluation = await scoreOrganizationResponse(
      member,
      id,
      requestId,
      responseId,
      score,
      notes
    );
    return NextResponse.json({ evaluation });
  } catch (error) {
    return toStatusResponse(error, "Failed to record evaluation.");
  }
}
