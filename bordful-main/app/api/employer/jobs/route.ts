import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createJob, listEmployerJobs, type JobPostInput } from '@/lib/jobs/employer-job-actions';
import { getEmployerById } from '@/lib/auth/employers';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const isRateLimited = createRateLimiter(10);

function parseJobInput(body: Record<string, unknown>): JobPostInput | null {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!title || !description) return null;

  const acceptsApplications = Boolean(body.acceptsApplications);
  const externalApplyUrl = typeof body.externalApplyUrl === 'string' ? body.externalApplyUrl.trim() : null;
  if (!acceptsApplications && !externalApplyUrl) return null;

  return {
    title,
    type: (body.type as JobPostInput['type']) || 'Full-time',
    description,
    benefits: typeof body.benefits === 'string' ? body.benefits.trim() || null : null,
    applicationRequirements:
      typeof body.applicationRequirements === 'string' ? body.applicationRequirements.trim() || null : null,
    workplaceType: (body.workplaceType as JobPostInput['workplaceType']) || 'Not specified',
    workplaceCity: typeof body.workplaceCity === 'string' ? body.workplaceCity.trim() || null : null,
    workplaceCountry: typeof body.workplaceCountry === 'string' ? body.workplaceCountry.trim() || null : null,
    careerLevel: Array.isArray(body.careerLevel) ? (body.careerLevel as JobPostInput['careerLevel']) : [],
    salaryMin: typeof body.salaryMin === 'number' ? body.salaryMin : null,
    salaryMax: typeof body.salaryMax === 'number' ? body.salaryMax : null,
    salaryCurrency: (body.salaryCurrency as JobPostInput['salaryCurrency']) || 'USD',
    salaryUnit: (body.salaryUnit as JobPostInput['salaryUnit']) || 'year',
    skills: typeof body.skills === 'string' ? body.skills.trim() || null : null,
    requiredSkills: Array.isArray(body.requiredSkills)
      ? body.requiredSkills.filter((s: unknown): s is string => typeof s === 'string').slice(0, 30)
      : [],
    minExperienceYears: typeof body.minExperienceYears === 'number' ? body.minExperienceYears : null,
    autoShortlistThreshold:
      typeof body.autoShortlistThreshold === 'number'
        ? Math.min(100, Math.max(0, body.autoShortlistThreshold))
        : 70,
    acceptsApplications,
    externalApplyUrl,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const jobs = await listEmployerJobs(session.user.id);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
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

  const employer = await getEmployerById(session.user.id);
  if (!employer?.companyName) {
    return NextResponse.json(
      { error: 'Add your company name in your profile before posting a job.' },
      { status: 400 }
    );
  }

  try {
    const job = await createJob(session.user.id, employer.companyName, input);
    return NextResponse.json({ job });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create job.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
