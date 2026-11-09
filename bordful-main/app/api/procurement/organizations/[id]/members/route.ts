import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { networkErrorResponse } from "@/lib/procurement/network-http";
import {
  listOrganizationMembers,
  type OrganizationMemberType,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";
import {
  removeMember,
  updateMemberRole,
} from "@/lib/procurement/organization-invitation-actions";

export const dynamic = "force-dynamic";

const MEMBER_TYPES: OrganizationMemberType[] = [
  "employer",
  "recruiter",
  "seeker",
];

function readTarget(body: Record<string, unknown>) {
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const memberType = body.memberType as OrganizationMemberType;
  if (!(memberId && MEMBER_TYPES.includes(memberType))) {
    return null;
  }
  return { memberId, memberType };
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
    const members = await listOrganizationMembers(member, id);
    return NextResponse.json({ members });
  } catch (error) {
    return networkErrorResponse(error, "Failed to load members.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const actor = resolveOrganizationMember(session);
  if (!actor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const target = readTarget(body);
  const { role } = body;
  if (!target) {
    return NextResponse.json({ error: "Invalid member." }, { status: 400 });
  }
  if (role !== "owner" && role !== "admin" && role !== "member") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    const updated = await updateMemberRole(actor, id, target, role);
    return NextResponse.json({ member: updated });
  } catch (error) {
    return networkErrorResponse(error, "Failed to update the member.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const actor = resolveOrganizationMember(session);
  if (!actor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const target = readTarget(body);
  if (!target) {
    return NextResponse.json({ error: "Invalid member." }, { status: 400 });
  }

  try {
    await removeMember(actor, id, target);
    return NextResponse.json({ removed: true });
  } catch (error) {
    return networkErrorResponse(error, "Failed to remove the member.");
  }
}
