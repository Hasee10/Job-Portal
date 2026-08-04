import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Briefcase, Search, Users } from 'lucide-react';

const SIGN_IN_PATHS = [
  { label: 'Job seeker sign in', href: '/account/sign-in' },
  { label: 'Recruiter sign in', href: '/recruiter/sign-in' },
  { label: 'Employer sign in', href: '/sign-in' },
] as const;

const JOB_PATHS = [
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

export function JoinChooser({ siteTitle }: { siteTitle: string }) {
  return (
    <>
      <div className="mx-auto mb-10 max-w-md text-center">
        <Image
          alt=""
          className="mx-auto mb-6 dark:hidden"
          height={60}
          priority
          src="/caliber-bowtie.svg"
          width={80}
        />
        <Image
          alt=""
          className="mx-auto mb-6 hidden dark:block"
          height={60}
          priority
          src="/caliber-bowtie-light.svg"
          width={80}
        />
        <h1 className="font-bold text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">
          How will you use {siteTitle}?
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Pick one - you can always come back and create a different type of account later.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
        {JOB_PATHS.map(({ icon: Icon, title, description, cta, href }) => (
          <Link
            className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
            href={href}
            key={title}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icon aria-hidden="true" className="h-6 w-6" />
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

      <div className="mx-auto mt-10 max-w-md space-y-2 border-zinc-200 border-t pt-6 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Already have an account?</p>
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
          {SIGN_IN_PATHS.map(({ label, href }) => (
            <Link
              className="font-medium text-primary underline hover:no-underline"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </p>
      </div>
    </>
  );
}
