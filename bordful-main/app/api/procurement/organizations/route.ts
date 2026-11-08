import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createOrganization,
  listOrganizationsForMember,
  resolveOrganizationMember,
} from "@/lib/procurement/organization-actions";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter(10);

function readProfile(body: Record<string, unknown>) {
  const asText = (value: unknown): string | null => {
    const text = typeof value === "string" ? value.trim() : "";
    return text || null;
  };
  return {
    companySize: asText(body.companySize),
    description: asText(body.description),
    industry: asText(body.industry),
    isBuyer: body.isBuyer === true,
    isSupplier: body.isSupplier === true,
    location: asText(body.location),
    name: typeof body.name === "string" ? body.name : "",
    website: asText(body.website),
  };
}

export async function GET() {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const organizations = await listOrganizationsForMember(member);
    return NextResponse.json({ organizations });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to load organizations.";
    return NextResponse.json({ error: msg }, { status: 400 });
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

  try {
    // The owner is taken from the session, never from the request body -
    // membership cannot be self-granted by posting someone else's id.
    const organization = await createOrganization(member, readProfile(body));
    return NextResponse.json({ organization });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to create organization.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
