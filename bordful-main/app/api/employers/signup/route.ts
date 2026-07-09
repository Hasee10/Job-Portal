import { NextResponse } from 'next/server';
import { createEmployer, EmployerAuthError } from '@/lib/auth/employers';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

// Tighter than the subscribe form's limit (5/window) - account creation is
// a more sensitive action (spam accounts, email-enumeration attempts).
const isRateLimited = createRateLimiter(3);

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const companyName =
      typeof body.companyName === 'string' ? body.companyName : undefined;

    const employer = await createEmployer(email, password, companyName);

    return NextResponse.json({ success: true, email: employer.email });
  } catch (error) {
    if (error instanceof EmployerAuthError) {
      const status = error.code === 'db_unavailable' ? 503 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    // Log the real error server-side only - never return raw error details
    // to the client (could leak DB error text).
    console.error('[api/employers/signup]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
