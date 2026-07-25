import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createJob, listOwnerJobs } from '@/lib/jobs/employer-job-actions';
import { parseJobInput } from '@/lib/jobs/parse-job-input';
import { getRecruiterAccountById } from '@/lib/auth/recruiter-accounts';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const isRateLimited = createRateLimiter(10);

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const jobs = await listOwnerJobs({ recruiterId: session.user.id });
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const input = parseJobInput(body);
  if (!input) {
    return NextResponse.json(
      { error: 'Title, description, and an apply method (in-app or external URL) are required.' },
      { status: 400 }
    );
  }

  const recruiter = await getRecruiterAccountById(session.user.id);
  const companyName = recruiter?.agency || recruiter?.name;
  if (!companyName) {
    return NextResponse.json(
      { error: 'Add your agency or name in your profile before posting a job.' },
      { status: 400 }
    );
  }

  try {
    const job = await createJob({ recruiterId: session.user.id }, companyName, input);
    return NextResponse.json({ job });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create job.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
