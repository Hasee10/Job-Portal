import {
  ArrowRight,
  ArrowUpRight,
  FileSearch,
  ShieldCheck,
  Users,
  MessagesSquare,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import config from "@/config";
import { ProductPreview } from "@/components/home/ProductPreview";
import styles from "@/components/home/marketing.module.css";
import { getActiveTenderCount } from "@/lib/procurement/scraped-tender-actions";
export const metadata: Metadata = {
  title: `Procurement | ${config.title}`,
  description:
    "Discover business partners and public tenders. Bring requests, supplier responses and sourcing decisions into one workspace.",
};
export const dynamic = "force-dynamic";
const FORMATS = [
  {
    name: "RFI",
    label: "Explore the market",
    description:
      "Understand supplier capabilities before you commit to a specification.",
  },
  {
    name: "RFQ",
    label: "Compare pricing",
    description:
      "Ask for comparable quotations against a well-defined requirement.",
  },
  {
    name: "RFP",
    label: "Evaluate the approach",
    description:
      "Invite proposals when the solution matters as much as the price.",
  },
  {
    name: "Tender",
    label: "Structure the process",
    description: "Set formal requirements, deadlines and evaluation criteria.",
  },
];
export default async function ProcurementLandingPage() {
  const [session, totalOpenTenders] = await Promise.all([
    auth(),
    getActiveTenderCount().catch(() => null),
  ]);
  const workspaceHref = "/procurement/organizations";
  const startHref = session?.user
    ? workspaceHref
    : "/sign-up?callbackUrl=/procurement/organizations";
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="procurement-title">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span />
              CALIBER / PROCUREMENT
            </p>
            <h1 id="procurement-title">
              Good business.
              <br />
              <em>Better connected.</em>
            </h1>
            <p className={styles.heroDescription}>
              Find the right partners. Bring clarity to sourcing. Move from the
              first conversation to your next business decision, in one place.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href={startHref}>
                {session?.user
                  ? "Open your workspace"
                  : "Create a business profile"}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <Link className={styles.secondary} href="/procurement/directory">
                Explore businesses
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.heroNote}>
              <span>FOR BUYERS</span>
              <span>FOR SUPPLIERS</span>
              <span>FOR WHAT’S NEXT</span>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <ProductPreview sourcing />
            <div className={styles.visualCaption}>
              <span>From requirements to responses.</span>
              <strong>Keep the bigger picture.</strong>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="discovery-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>OPEN THE RIGHT DOORS</p>
            <h2 id="discovery-title">
              Your next opportunity
              <br />
              could start here.
            </h2>
          </div>
          <p className={styles.intro}>
            Explore the public marketplace before you start sourcing. No
            business workspace required to browse.
          </p>
        </div>
        <div className={styles.discovery}>
          <div>
            <FileSearch size={26} aria-hidden="true" />
            {totalOpenTenders !== null ? (
              <>
                <div className={styles.tenderCount}>
                  {totalOpenTenders.toLocaleString()}
                </div>
                <h3>Open tenders to explore.</h3>
              </>
            ) : (
              <h3 className="mt-6">
                Public opportunities.
                <br />A wider perspective.
              </h3>
            )}
            <p>
              Browse aggregated public notices from TED and PPRA.
              <small>
                Check the original source for current requirements and
                deadlines.
              </small>
            </p>
            <Link className={styles.textLink} href="/procurement/tenders">
              Browse public tenders
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div>
            <Users size={26} aria-hidden="true" />
            <h3 className="mt-6">
              Find a business.
              <br />
              Start a relationship.
            </h3>
            <p>
              Discover buyers and suppliers by category, location and
              capabilities. Get a clearer picture of who you could work with.
            </p>
            <p className="text-xs text-muted-foreground">
              Business information is self-declared, not independently verified.
            </p>
            <Link className={styles.textLink} href="/procurement/directory">
              Explore the directory
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section className={styles.band} aria-labelledby="workspace-title">
        <div className={styles.bandInner}>
          <div>
            <p className={styles.kicker}>WORK TOGETHER. WITH CONTEXT.</p>
            <h2 id="workspace-title">
              A workspace for the
              <br />
              whole conversation.
            </h2>
            <p>
              Move beyond scattered messages and documents. Give each business
              relationship a place to develop.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-3 border-b border-white/40 pb-2 text-sm"
              href={workspaceHref}
            >
              Explore your workspace
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.benefitGrid}>
            {[
              {
                icon: Users,
                title: "Business connections",
                text: "Build a network around your organization, not a disconnected contact list.",
              },
              {
                icon: MessagesSquare,
                title: "Shared context",
                text: "Keep conversations tied to the businesses you work with.",
              },
              {
                icon: FileSearch,
                title: "Structured requests",
                text: "Bring requirements and supplier responses into a clear sourcing process.",
              },
              {
                icon: ShieldCheck,
                title: "Membership-based access",
                text: "Your organization’s workspace stays scoped to its members and permissions.",
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
      <section className={styles.section} aria-labelledby="formats-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>THE RIGHT STARTING POINT</p>
            <h2 id="formats-title">
              Different needs.
              <br />A more considered process.
            </h2>
          </div>
          <p className={styles.intro}>
            Choose the request format around the decision you need to make.
          </p>
        </div>
        <div className={styles.formats}>
          {FORMATS.map((f, i) => (
            <article className={styles.format} key={f.name}>
              <small>
                0{i + 1} / {f.label.toUpperCase()}
              </small>
              <h3>{f.name}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y bg-muted/20">
        <div className={styles.section}>
          <div className={styles.process}>
            <div>
              <p className={styles.kicker}>FROM BRIEF TO DECISION</p>
              <h2>
                A clear next step.
                <br />
                At every stage.
              </h2>
              <p className={`${styles.intro} mt-5`}>
                Start with the requirement. Keep suppliers and evaluation
                connected as the process moves forward.
              </p>
            </div>
            <ol>
              {[
                {
                  title: "Define what you need",
                  text: "Choose a format, describe the requirement, and set your deadline and evaluation criteria.",
                },
                {
                  title: "Bring the right suppliers in",
                  text: "Invite suppliers and collect responses in the context of your request.",
                },
                {
                  title: "Compare, decide and record",
                  text: "Review submissions, evaluate your options and keep a record of the decision.",
                },
              ].map((step, i) => (
                <li key={step.title}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="roles-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>TWO SIDES. SHARED PROGRESS.</p>
            <h2 id="roles-title">Built for the way you do business.</h2>
          </div>
        </div>
        <div className={styles.resources}>
          <article className={styles.resource}>
            <span className={styles.resourceNumber}>B</span>
            <div>
              <h3>For buyers</h3>
              <p>
                Discover partners, organize your requirements and give sourcing
                decisions a clearer foundation.
              </p>
              <Link className={styles.textLink} href={startHref}>
                Start your business profile
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </article>
          <article className={styles.resource}>
            <span className={styles.resourceNumber}>S</span>
            <div>
              <h3>For suppliers</h3>
              <p>
                Make your capabilities visible. Build connections and respond to
                invitations from your business workspace.
              </p>
              <Link
                className={styles.textLink}
                href={
                  session?.user
                    ? workspaceHref
                    : "/sign-in?callbackUrl=/procurement/organizations"
                }
              >
                Open your business workspace
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
