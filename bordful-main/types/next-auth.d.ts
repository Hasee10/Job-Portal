import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: 'employer' | 'seeker' | 'recruiter';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    employerId?: string;
    seekerId?: string;
    recruiterId?: string;
    role?: 'employer' | 'seeker' | 'recruiter';
  }
}
