import {
  ArrowUpRight,
  Check,
  FileText,
  ShieldCheck,
  Users,
  MessagesSquare,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GuestHero } from "./GuestHero";
import styles from "./marketing.module.css";
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
  },
] as const;

export function PublicLanding({
  jobsUnavailable = false,
}: {
  jobsUnavailable?: boolean;
}) {
  return (
    <main className={styles.page}>
      <GuestHero />
      <section className={styles.section} aria-labelledby="pathways-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>
              DIFFERENT AMBITIONS. THE SAME MOMENTUM.
            </p>
            <h2 id="pathways-title">Built for your next move.</h2>
          </div>
          <p className={styles.intro}>
            Choose the path that matters to you. We’ll help you turn discovery
            into a clear next step.
          </p>
        </div>
        {PATHS.map((path, i) => (
          <article
            className={`${styles.featureRow} ${i === 1 ? styles.reverse : ""}`}
            key={path.id}
          >
            <div className={styles.featureArt}>
              <Image
                src={`/illustrations/${path.image}.svg`}
                alt=""
                width={640}
                height={360}
              />
            </div>
            <div>
              <p className={styles.kicker}>
                {path.number} / {path.label}
              </p>
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              <ul>
                {path.features.map((f) => (
                  <li key={f}>
                    <Check size={16} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link className={styles.textLink} href={path.href}>
                {path.cta}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
              <p className="mt-3">
                <Link
                  className="text-xs underline underline-offset-4"
                  href={path.secondary}
                >
                  {path.secondaryLabel}
                </Link>
              </p>
            </div>
          </article>
        ))}
        {jobsUnavailable && (
          <p role="status" className="rounded-lg border p-4 text-sm">
            Job listings are temporarily unavailable. You can still explore the
            platform and use Procurement.
          </p>
        )}
      </section>
      <section className={styles.band} aria-labelledby="benefits-title">
        <div className={styles.bandInner}>
          <div>
            <p className={styles.kicker}>LESS FRICTION. MORE FOCUS.</p>
            <h2 id="benefits-title">
              Discovery is just
              <br />
              the beginning.
            </h2>
            <p>
              Keep the important things together, so your next opportunity
              becomes something you can act on.
            </p>
          </div>
          <div className={styles.benefitGrid}>
            {[
              {
                icon: FileText,
                title: "A profile with purpose",
                text: "Show your experience or your business capabilities in the right context.",
              },
              {
                icon: Users,
                title: "Connections that count",
                text: "Explore relevant roles and discover businesses you want to work with.",
              },
              {
                icon: MessagesSquare,
                title: "A clearer conversation",
                text: "Keep business conversations connected to the relationship.",
              },
              {
                icon: ShieldCheck,
                title: "Your work, in its place",
                text: "Private business workspaces are scoped to your organization’s memberships.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon size={22} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="journeys-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>START WITH SOMETHING USEFUL</p>
            <h2 id="journeys-title">A little direction goes a long way.</h2>
          </div>
          <p className={styles.intro}>
            Practical ways to get moving, whether you’re planning a career
            change or your next business relationship.
          </p>
        </div>
        <div className={styles.resources}>
          <article className={styles.resource}>
            <span className={styles.resourceNumber}>01</span>
            <div>
              <h3>Your career journey</h3>
              <p>
                Make your experience stand out. Explore practical guides on
                resumes, applications and interviews.
              </p>
              <Link className={styles.textLink} href="/guides">
                Explore career guides
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </article>
          <article className={styles.resource}>
            <span className={styles.resourceNumber}>02</span>
            <div>
              <h3>Your business journey</h3>
              <p>
                Get to know the market. Browse buyer and supplier profiles
                before starting your next conversation.
              </p>
              <Link className={styles.textLink} href="/procurement/directory">
                Discover businesses
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
