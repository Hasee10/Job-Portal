import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: 'employer' | 'seeker';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    employerId?: string;
    seekerId?: string;
    role?: 'employer' | 'seeker';
  }
}
