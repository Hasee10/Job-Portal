import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  createOrganizationRequest,
  listOrganizationRequests,
  OrganizationRfqError,
} from "@/lib/procurement/organization-rfq-actions";
import type {
  ProcurementType,
  ProcurementVisibility,
} from "@/lib/procurement/request-actions";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter(20);
const TYPES: ProcurementType[] = ["rfi", "rfq", "rfp", "tender"];

function failure(error: unknown) {
  if (error instanceof OrganizationRfqError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "not_found" ? 404 : 400 }
    );
  }
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

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
    return NextResponse.json({
      requests: await listOrganizationRequests(member, id),
    });
  } catch (error) {
    return failure(error);
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
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const type = TYPES.includes(body.type as ProcurementType)
    ? (body.type as ProcurementType)
    : "rfq";

  try {
    const created = await createOrganizationRequest(member, id, {
      category: text(body.category),
      description: text(body.description),
      requiresPrequalification: body.requiresPrequalification === true,
      responseDeadline: text(body.responseDeadline) || null,
      sealedBids: body.sealedBids === true,
      specFields: [],
      title: text(body.title),
      type,
      // Invite-only is the M4A workflow; an organization request is not
      // silently opened to the whole marketplace.
      visibility: "invite_only" as ProcurementVisibility,
    });
    return NextResponse.json({ request: created });
  } catch (error) {
    return failure(error);
  }
}
