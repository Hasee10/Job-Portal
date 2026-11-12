import {
  ArrowRight,
  Check,
  FileSearch,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GuestHero } from "./GuestHero";
import styles from "./landing.module.css";

const PATHS = [
  {
    id: "jobs",
    number: "01",
    label: "FOR YOUR CAREER",
    title: "Find work that moves you forward.",
    description:
      "Discover roles, keep your applications organized, and build a resume that reflects what you bring.",
    image: "jobs-pathway",
    features: [
      "Search roles by location, type and experience",
      "Save opportunities and manage applications",
      "Build and tailor your resume",
    ],
    href: "/jobs",
    cta: "Find your next role",
    secondary: "/pricing",
    secondaryLabel: "Hiring? Explore job posting",
    steps: [
      "Create your job-seeker profile",
      "Discover and save relevant roles",
      "Apply and track your next steps",
    ],
  },
  {
    id: "procurement",
    number: "02",
    label: "FOR YOUR BUSINESS",
    title: "Good business starts with the right connections.",
    description:
      "Bring your business into a marketplace built for buyers and suppliers. Discover partners and manage sourcing from request to award.",
    image: "business-network",
    features: [
      "Create a buyer, supplier or combined profile",
      "Connect with businesses and start conversations",
      "Manage RFQs, quotations and awards",
    ],
    href: "/procurement",
    cta: "Explore Procurement",
    secondary: "/procurement/directory",
    secondaryLabel: "Browse the business directory",
    steps: [
      "Create or select your business",
      "Discover partners and connect",
      "Request, compare and award",
    ],
  },
] as const;

export function PublicLanding({
  jobsUnavailable = false,
}: {
  jobsUnavailable?: boolean;
}) {
  return (
    <main className={styles.landing}>
      <GuestHero />
      <div className="border-b bg-muted/30">
        <div className="container mx-auto flex flex-wrap justify-center gap-x-10 gap-y-3 px-4 py-5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Users size={16} aria-hidden="true" /> Individual and business
            profiles
          </span>
          <span className="inline-flex items-center gap-2">
            <FileSearch size={16} aria-hidden="true" /> Clear workflows, from
            start to finish
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={16} aria-hidden="true" /> Private,
            membership-based workspaces
          </span>
        </div>
      </div>
      <section
        className="container mx-auto px-4 py-16 sm:py-20"
        aria-labelledby="pathways-title"
      >
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={styles.sectionLabel}>
              ONE PLATFORM. TWO CLEAR PATHS.
            </p>
            <h2
              id="pathways-title"
              className="mt-3 font-semibold text-3xl tracking-tight sm:text-4xl"
            >
              What brings you here?
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Start with what you need today. Your career and your business each
            have a place here.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {PATHS.map((path) => (
            <article key={path.id} className={styles.pathCard}>
              <div className="flex items-center justify-between px-7 pt-7">
                <p className={styles.sectionLabel}>{path.label}</p>
                <span className="font-mono text-sm text-muted-foreground">
                  {path.number}
                </span>
              </div>
              <div className="px-5 pt-5">
                <Image
                  src={`/illustrations/${path.image}.svg`}
                  alt=""
                  width={640}
                  height={360}
                  className="h-auto w-full rounded-xl"
                />
              </div>
              <div className="flex flex-1 flex-col p-7">
                <h3 className="max-w-md font-semibold text-2xl leading-tight tracking-tight">
                  {path.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {path.description}
                </p>
                <ul className="my-6 space-y-3 text-sm">
                  {path.features.map((feature) => (
                    <li className="flex items-start gap-2.5" key={feature}>
                      <Check
                        className="mt-0.5 shrink-0 text-primary"
                        size={16}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link className={`${styles.pathCta} mt-auto`} href={path.href}>
                  {path.cta}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link
                  className="mt-4 text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
                  href={path.secondary}
                >
                  {path.secondaryLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
        {jobsUnavailable && (
          <p
            role="status"
            className="mt-5 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
          >
            Job listings are temporarily unavailable. You can still explore the
            platform and use Procurement.
          </p>
        )}
      </section>
      <section className="border-y bg-muted/25" aria-labelledby="steps-title">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <p className={styles.sectionLabel}>A CLEAR NEXT STEP</p>
          <h2
            id="steps-title"
            className="mt-3 font-semibold text-3xl tracking-tight"
          >
            From getting started to moving forward.
          </h2>
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            {PATHS.map((path) => (
              <div key={path.id}>
                <h3 className="font-semibold text-lg">
                  {path.id === "jobs"
                    ? "Your career journey"
                    : "Your business journey"}
                </h3>
                <ol className="mt-5 space-y-4">
                  {path.steps.map((step, index) => (
                    <li className="flex items-center gap-4 text-sm" key={step}>
                      <span
                        className={`${styles.stepNumber} flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 font-mono text-xs`}
                      >
                        0{index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-16 text-center sm:py-20">
        <p className={styles.sectionLabel}>YOUR NEXT CHAPTER STARTS HERE</p>
        <h2 className="mt-3 font-semibold text-3xl tracking-tight">
          Choose your path. Make your move.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          A new role, a new supplier, a new business relationship. Start with a
          profile built for the way you work.
        </p>
        <Link className={`${styles.pathCta} mx-auto mt-7 w-fit`} href="/join">
          Get started <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
