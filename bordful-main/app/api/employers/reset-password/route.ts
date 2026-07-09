import { NextResponse } from 'next/server';
import { EmployerAuthError, resetPasswordWithToken } from '@/lib/auth/employers';
import { createRateLimiter, getClientIp } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

const isRateLimited = createRateLimiter(10);

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
    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!token) {
      return NextResponse.json(
        { error: 'Missing or invalid reset link.' },
        { status: 400 }
      );
    }

    const success = await resetPasswordWithToken(token, password);
    if (!success) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof EmployerAuthError) {
      const status = error.code === 'db_unavailable' ? 503 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('[api/employers/reset-password]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
