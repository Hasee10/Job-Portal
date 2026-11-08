import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getOrganizationForMember,
  resolveOrganizationMember,
  updateOrganizationProfile,
} from "@/lib/procurement/organization-actions";

export const dynamic = "force-dynamic";

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
  const organization = await getOrganizationForMember(member, id);
  if (!organization) {
    // Same response whether it does not exist or the caller is not a member,
    // so this cannot be used to probe which organization ids are real.
    return NextResponse.json(
      { error: "Organization not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({ organization });
}

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
  const asText = (value: unknown): string | null => {
    const text = typeof value === "string" ? value.trim() : "";
    return text || null;
  };

  try {
    const organization = await updateOrganizationProfile(member, id, {
      companySize: asText(body.companySize),
      description: asText(body.description),
      industry: asText(body.industry),
      isBuyer: body.isBuyer === true,
      isSupplier: body.isSupplier === true,
      location: asText(body.location),
      name: typeof body.name === "string" ? body.name : "",
      website: asText(body.website),
    });
    return NextResponse.json({ organization });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to update organization.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
