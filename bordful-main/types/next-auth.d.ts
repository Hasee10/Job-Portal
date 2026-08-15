import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      // 'vendor' is reserved for standalone (non-recruiter) vendor accounts
      // in the procurement module - schema-ready, no login path issues this
      // role yet (Phase 1 only wires recruiter-linked vendors).
      role?: 'employer' | 'seeker' | 'recruiter' | 'vendor';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    employerId?: string;
    seekerId?: string;
    recruiterId?: string;
    vendorId?: string;
    role?: 'employer' | 'seeker' | 'recruiter' | 'vendor';
  }
}
