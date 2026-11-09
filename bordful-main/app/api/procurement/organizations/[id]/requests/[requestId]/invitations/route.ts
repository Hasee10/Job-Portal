import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import {
  inviteSupplierOrganizations,
  listRequestSupplierInvitations,
  OrganizationRfqError,
  publishOrganizationRequest,
} from "@/lib/procurement/organization-rfq-actions";

export const dynamic = "force-dynamic";

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
      invitations: await listRequestSupplierInvitations(member, id, requestId),
    });
  } catch (error) {
    return failure(error);
  }
}

// Invite suppliers, and optionally publish the request in the same step -
// the buyer's usual intent is "open this and tell these suppliers", and
// doing both here avoids a half-opened RFQ with no one invited.
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
  const body = (await request.json()) as Record<string, unknown>;
  const supplierOrgIds = Array.isArray(body.supplierOrgIds)
    ? body.supplierOrgIds.filter(
        (value): value is string => typeof value === "string"
      )
    : [];

  try {
    const result = await inviteSupplierOrganizations(
      member,
      id,
      requestId,
      supplierOrgIds
    );
    if (body.publish === true) {
      await publishOrganizationRequest(member, id, requestId).catch(
        (error: unknown) => {
          // Already published is not a failure of the invitation itself.
          if (!(error instanceof OrganizationRfqError)) {
            throw error;
          }
        }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}
