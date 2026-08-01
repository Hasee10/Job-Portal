import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getJob } from '@/lib/db/airtable.server';
import { diffSkills, scoreJobMatch } from '@/lib/jobs/match-scoring';
import { getSeekerResume } from '@/lib/jobs/resume-actions';
import { splitSkills } from '@/lib/jobs/resume-matching';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const jobId = body.jobId as string | undefined;
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });
  }

  const [resume, job] = await Promise.all([
    getSeekerResume(session.user.id),
    getJob(jobId),
  ]);

  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }
  if (!resume || resume.content.skills.length === 0) {
    // No parsed resume on file yet - nothing to score against, and not an
    // error the client needs to surface loudly.
    return NextResponse.json({ available: false });
  }

  const jobSkills = splitSkills(job.skills);
  const { matchedSkills, missingSkills } = diffSkills(resume.content.skills, jobSkills);

  const result = await scoreJobMatch(
    {
      headline: resume.content.headline,
      summary: resume.content.summary,
      skills: resume.content.skills,
      experience: resume.content.experience.map((entry) => ({
        title: entry.title,
        company: entry.company,
        description: entry.description,
      })),
    },
    { title: job.title, description: job.description, skills: jobSkills }
  );

  return NextResponse.json({
    available: true,
    score: result.score,
    method: result.method,
    reasoning: result.reasoning ?? null,
    matchedSkills,
    missingSkills,
  });
}
