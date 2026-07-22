import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  EMPTY_RESUME_CONTENT,
  getSeekerResume,
  saveSeekerResume,
  type ResumeContent,
} from '@/lib/jobs/resume-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const resume = await getSeekerResume(session.user.id);
  return NextResponse.json({ resume });
}

function sanitizeContent(value: unknown): ResumeContent {
  if (!value || typeof value !== 'object') {
    return EMPTY_RESUME_CONTENT;
  }
  const raw = value as Partial<ResumeContent>;
  return {
    fullName: typeof raw.fullName === 'string' ? raw.fullName.slice(0, 200) : '',
    headline: typeof raw.headline === 'string' ? raw.headline.slice(0, 200) : '',
    summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 2000) : '',
    experience: Array.isArray(raw.experience)
      ? raw.experience.slice(0, 20).map((entry) => ({
          title: typeof entry?.title === 'string' ? entry.title.slice(0, 200) : '',
          company: typeof entry?.company === 'string' ? entry.company.slice(0, 200) : '',
          startDate: typeof entry?.startDate === 'string' ? entry.startDate.slice(0, 50) : '',
          endDate: typeof entry?.endDate === 'string' ? entry.endDate.slice(0, 50) : '',
          description:
            typeof entry?.description === 'string' ? entry.description.slice(0, 2000) : '',
        }))
      : [],
    education: Array.isArray(raw.education)
      ? raw.education.slice(0, 10).map((entry) => ({
          school: typeof entry?.school === 'string' ? entry.school.slice(0, 200) : '',
          degree: typeof entry?.degree === 'string' ? entry.degree.slice(0, 200) : '',
          year: typeof entry?.year === 'string' ? entry.year.slice(0, 50) : '',
        }))
      : [],
    skills: Array.isArray(raw.skills)
      ? raw.skills.filter((s) => typeof s === 'string').slice(0, 50)
      : [],
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const resume = await saveSeekerResume(
    session.user.id,
    sanitizeContent(body.content)
  );

  return NextResponse.json({ resume });
}
