import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  closeJob,
  getOwnerJob,
  reopenJob,
  updateJob,
} from "@/lib/jobs/employer-job-actions";
import { parseJobUpdateInput } from "@/lib/jobs/parse-job-input";
import { getEmployerById } from "@/lib/auth/employers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employer") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const job = await getOwnerJob({ employerId: session.user.id }, id);
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employer") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const owner = { employerId: session.user.id } as const;

  if (body.action === "close") {
    await closeJob(owner, id);
    return NextResponse.json({ success: true });
  }
  if (body.action === "reopen") {
    await reopenJob(owner, id);
    return NextResponse.json({ success: true });
  }

  const employer = await getEmployerById(session.user.id);
  if (!employer?.companyName) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 }
    );
  }

  const patch = parseJobUpdateInput(body, employer.companyName);

  try {
    const job = await updateJob(owner, id, patch);
    return NextResponse.json({ job });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to update job.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
