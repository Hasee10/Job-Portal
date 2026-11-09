import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  type ConnectionDirection,
  listConnections,
  requestConnection,
} from "@/lib/procurement/connection-actions";
import { networkErrorResponse } from "@/lib/procurement/network-http";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter(20);

export async function GET(request: Request) {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organizationId = new URL(request.url).searchParams.get(
    "organizationId"
  );
  if (!organizationId) {
    return NextResponse.json(
      { error: "An organization is required." },
      { status: 400 }
    );
  }

  try {
    // Membership of this organization is checked in the action; the id in
    // the query string grants nothing on its own.
    const connections = await listConnections(member, organizationId);
    return NextResponse.json({ connections });
  } catch (error) {
    return networkErrorResponse(error, "Failed to load connections.");
  }
}

export async function POST(request: Request) {
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

  const body = (await request.json()) as Record<string, unknown>;
  const fromOrganizationId =
    typeof body.fromOrganizationId === "string" ? body.fromOrganizationId : "";
  const toOrganizationId =
    typeof body.toOrganizationId === "string" ? body.toOrganizationId : "";
  const direction = body.direction as ConnectionDirection;

  if (!(fromOrganizationId && toOrganizationId)) {
    return NextResponse.json(
      { error: "Both businesses are required." },
      { status: 400 }
    );
  }
  if (direction !== "we_buy" && direction !== "we_supply") {
    return NextResponse.json(
      { error: "Choose whether you want to buy from or supply this business." },
      { status: 400 }
    );
  }

  try {
    const connection = await requestConnection(member, {
      direction,
      fromOrganizationId,
      message: typeof body.message === "string" ? body.message : null,
      toOrganizationId,
    });
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    return networkErrorResponse(error, "Failed to send the request.");
  }
}
