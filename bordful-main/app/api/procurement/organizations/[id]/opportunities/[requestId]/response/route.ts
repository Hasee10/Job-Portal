import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  getMyOrganizationResponse,
  OrganizationResponseError,
  submitOrganizationResponse,
  withdrawOrganizationResponse,
} from "@/lib/procurement/organization-response-actions";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter(20);

function failure(error: unknown) {
  if (error instanceof OrganizationResponseError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "not_found" ? 404 : 400 }
    );
  }
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

// Supplier-side only: [id] is the invited organization, scoped by its own
// invitation rather than by ownership of the request.
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
    return NextResponse.json({
      response: await getMyOrganizationResponse(member, id, requestId),
    });
  } catch (error) {
    return failure(error);
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
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { id, requestId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const proposalText =
    typeof body.proposalText === "string"
      ? body.proposalText.trim().slice(0, 10_000)
      : null;
  const pricing =
    body.pricing && typeof body.pricing === "object"
      ? (body.pricing as Record<string, unknown>)
      : null;

  try {
    const response = await submitOrganizationResponse(member, id, requestId, {
      pricing,
      // Document upload is not part of this milestone's organization-owned
      // flow: requests an organization creates default to type "rfq",
      // which does not require a document, and adding organization-aware
      // storage authorization for rfp/tender is deferred.
      proposalDocumentPath: null,
      proposalText,
    });
    return NextResponse.json({ response });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
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
    await withdrawOrganizationResponse(member, id, requestId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
