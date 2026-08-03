import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AIProviderError } from '@/lib/ai/types';
import { submitApplication, getJobOwnerContact } from '@/lib/jobs/application-actions';
import { getSeekerResume } from '@/lib/jobs/resume-actions';
import { extractResumeFromPdf } from '@/lib/jobs/resume-extraction';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';
import { sendEmail } from '@/lib/email/smtp';
import { renderApplicationReceivedEmail } from '@/lib/email/templates/application-received';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const isRateLimited = createRateLimiter(10);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const coverLetter = (formData.get('coverLetter') as string | null)?.trim().slice(0, 3000) || null;
  const useExisting = formData.get('useExisting') === 'true';
  const file = formData.get('file');

  let resumeSnapshot;
  if (useExisting) {
    const resume = await getSeekerResume(session.user.id);
    if (!resume) {
      return NextResponse.json(
        { error: 'No saved resume found. Upload a resume instead.' },
        { status: 400 }
      );
    }
    resumeSnapshot = resume.content;
  } else if (file instanceof File) {
    try {
      resumeSnapshot = await extractResumeFromPdf(file);
    } catch (error) {
      if (error instanceof AIProviderError && error.notConfigured) {
        return NextResponse.json(
          { error: 'Resume parsing is not available yet on this deployment.' },
          { status: 503 }
        );
      }
      const message = error instanceof Error ? error.message : "Couldn't parse that resume.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'A resume is required to apply.' }, { status: 400 });
  }

  try {
    const { application, jobTitle } = await submitApplication(session.user.id, id, {
      resumeSnapshot,
      coverLetter,
    });

    // Notify the job owner — fire-and-catch so email failure never blocks the application.
    try {
      const owner = await getJobOwnerContact(id);
      if (owner) {
        const applicantName = session.user.name || session.user.email || 'A candidate';
        const pipelineUrl =
          owner.type === 'recruiter'
            ? `${process.env.NEXTAUTH_URL ?? ''}/recruiter/jobs/${id}/applications`
            : `${process.env.NEXTAUTH_URL ?? ''}/dashboard/jobs/${id}/applications`;
        const { subject, html } = renderApplicationReceivedEmail({
          ownerType: owner.type,
          applicantName,
          jobTitle,
          matchScore: application.matchScore,
          autoShortlisted: application.autoShortlisted,
          pipelineUrl,
        });
        await sendEmail({ to: owner.email, subject, html });
      }
    } catch (emailErr) {
      console.error('[api/jobs/[id]/apply] owner notification email failed:', emailErr);
    }

    return NextResponse.json({ application });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to submit application.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
