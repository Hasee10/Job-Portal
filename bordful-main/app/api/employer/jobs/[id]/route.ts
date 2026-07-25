import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  closeJob,
  getEmployerJob,
  reopenJob,
  updateJob,
  type JobPostInput,
} from '@/lib/jobs/employer-job-actions';
import { getEmployerById } from '@/lib/auth/employers';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const job = await getEmployerJob(session.user.id, id);
  if (!job) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (body.action === 'close') {
    await closeJob(session.user.id, id);
    return NextResponse.json({ success: true });
  }
  if (body.action === 'reopen') {
    await reopenJob(session.user.id, id);
    return NextResponse.json({ success: true });
  }

  const employer = await getEmployerById(session.user.id);
  if (!employer?.companyName) {
    return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
  }

  const patch: Partial<JobPostInput> & { companyName: string } = { companyName: employer.companyName };
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.type === 'string') patch.type = body.type as JobPostInput['type'];
  if (typeof body.description === 'string') patch.description = body.description;
  if ('benefits' in body) patch.benefits = typeof body.benefits === 'string' ? body.benefits.trim() || null : null;
  if ('applicationRequirements' in body) {
    patch.applicationRequirements =
      typeof body.applicationRequirements === 'string' ? body.applicationRequirements.trim() || null : null;
  }
  if (typeof body.workplaceType === 'string') patch.workplaceType = body.workplaceType as JobPostInput['workplaceType'];
  if ('workplaceCity' in body) patch.workplaceCity = typeof body.workplaceCity === 'string' ? body.workplaceCity.trim() || null : null;
  if ('workplaceCountry' in body) patch.workplaceCountry = typeof body.workplaceCountry === 'string' ? body.workplaceCountry.trim() || null : null;
  if (Array.isArray(body.careerLevel)) patch.careerLevel = body.careerLevel;
  if (typeof body.salaryMin === 'number' || body.salaryMin === null) patch.salaryMin = body.salaryMin;
  if (typeof body.salaryMax === 'number' || body.salaryMax === null) patch.salaryMax = body.salaryMax;
  if (typeof body.salaryCurrency === 'string') patch.salaryCurrency = body.salaryCurrency;
  if (typeof body.salaryUnit === 'string') patch.salaryUnit = body.salaryUnit;
  if ('skills' in body) patch.skills = typeof body.skills === 'string' ? body.skills.trim() || null : null;
  if (Array.isArray(body.requiredSkills)) {
    patch.requiredSkills = body.requiredSkills.filter((s: unknown): s is string => typeof s === 'string').slice(0, 30);
  }
  if (typeof body.minExperienceYears === 'number' || body.minExperienceYears === null) {
    patch.minExperienceYears = body.minExperienceYears;
  }
  if (typeof body.autoShortlistThreshold === 'number') {
    patch.autoShortlistThreshold = Math.min(100, Math.max(0, body.autoShortlistThreshold));
  }
  if (typeof body.acceptsApplications === 'boolean') patch.acceptsApplications = body.acceptsApplications;
  if (typeof body.externalApplyUrl === 'string') patch.externalApplyUrl = body.externalApplyUrl.trim();

  try {
    const job = await updateJob(session.user.id, id, patch);
    return NextResponse.json({ job });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update job.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
