import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, Search, Users } from 'lucide-react';
import config from '@/config';

export const metadata: Metadata = {
  title: `Join ${config.title}`,
  description: 'Choose how you want to use the platform.',
  robots: { index: false, follow: false },
};

const PATHS = [
  {
    icon: Search,
    title: "I'm looking for a job",
    description: 'Save jobs, track applications, build a resume, and get matched with recruiters and employers.',
    cta: 'Continue as a job seeker',
    href: '/account/sign-in?intent=signup',
  },
  {
    icon: Users,
    title: "I'm a recruiter",
    description: 'Search candidates who are open to opportunities and reach out directly.',
    cta: 'Continue as a recruiter',
    href: '/recruiter/sign-up',
  },
  {
    icon: Briefcase,
    title: "I'm hiring",
    description: 'Post jobs, review applications, and find candidates for your open roles.',
    cta: 'Continue as an employer',
    href: '/sign-up',
  },
] as const;

export default function JoinPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-md text-center">
          <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-50">How will you use {config.title}?</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Pick one - you can always come back and create a different type of account later.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
          {PATHS.map(({ icon: Icon, title, description, cta, href }) => (
            <Link
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
              href={href}
              key={title}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-50">{title}</h2>
              <p className="mt-1.5 flex-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {cta}
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
