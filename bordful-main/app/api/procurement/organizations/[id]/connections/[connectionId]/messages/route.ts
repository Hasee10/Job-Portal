import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listMessages,
  MessageError,
  sendMessage,
} from "@/lib/procurement/message-actions";
import { resolveOrganizationMember } from "@/lib/procurement/organization-actions";
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter(30);

// The organization is taken from the route, then proved against the caller's
// membership inside resolveConversation - it is never trusted as given.
function failure(error: unknown) {
  if (error instanceof MessageError) {
    const status = error.code === "not_found" ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  const session = await auth();
  const member = resolveOrganizationMember(session);
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { connectionId, id } = await params;
  const pageParam = new URL(request.url).searchParams.get("page");
  const page = Number.parseInt(pageParam ?? "1", 10);

  try {
    const result = await listMessages(member, id, connectionId, page);
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
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

  const { connectionId, id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const text = typeof body.body === "string" ? body.body : "";

  try {
    const message = await sendMessage(member, id, connectionId, text);
    return NextResponse.json({ message });
  } catch (error) {
    return failure(error);
  }
}
